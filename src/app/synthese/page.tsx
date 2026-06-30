import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';
import { listComparisonWords, type WordComparisonContribution } from '@/lib/db';
import { getLanguageLabel, LANGUAGES } from '@/lib/languages';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 8;
const SYNTHESIS_LANGUAGE_IDS = new Set<string>(LANGUAGES.filter((language) => language.id !== 'other').map((language) => language.id));

type SynthesisVariant = {
  language: string;
  label: string;
  forms: string[];
};

type SynthesisResult = {
  proposed: string;
  simplified: string;
  isComposite: boolean;
  confidence: 'Eleve' | 'Moyen' | 'Faible';
  expertReview: string;
  analysis: string;
  justification: string;
  options: string[];
};

function displayText(value: string) {
  return value.trim() || '-';
}

function normalizeForm(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/[^a-zɑɔəɛɨʉŋɲʃʒɓɗ' -]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifiedForm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function syllableShape(value: string) {
  const normalized = normalizeForm(value);
  return normalized
    .replace(/[aeiouɑɔəɛɨʉ]/g, 'V')
    .replace(/[a-zŋɲʃʒɓɗ]/g, 'C')
    .replace(/[^CV]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function levenshtein(left: string, right: string) {
  const a = [...left];
  const b = [...right];
  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}

function similarity(left: string, right: string) {
  const a = normalizeForm(left);
  const b = normalizeForm(right);
  if (!a || !b) return 0;
  const maxLength = Math.max([...a].length, [...b].length);
  if (maxLength === 0) return 1;
  return 1 - levenshtein(a, b) / maxLength;
}

function mostCommon<T>(values: T[]) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
}

function uniqueForms(forms: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const form of forms.map((item) => item.trim()).filter(Boolean)) {
    const key = normalizeForm(form);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(form);
  }
  return result;
}

function tokenizeForm(value: string) {
  return value
    .trim()
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildCompositeCandidate(formsByLanguage: Array<{ form: string; language: string }>) {
  const tokenized = formsByLanguage
    .map((item) => ({ ...item, tokens: tokenizeForm(item.form) }))
    .filter((item) => item.tokens.length > 1);

  if (tokenized.length < 2) return null;

  const tokenCount = mostCommon(tokenized.map((item) => item.tokens.length))?.[0];
  if (!tokenCount || tokenCount < 2) return null;

  const aligned = tokenized.filter((item) => item.tokens.length === tokenCount);
  if (aligned.length < 2) return null;

  const selected = Array.from({ length: tokenCount }, (_, index) => {
    const tokens = aligned.map((item) => ({
      token: item.tokens[index],
      language: item.language,
      sourceForm: item.form,
    }));
    const uniqueTokens = uniqueForms(tokens.map((item) => item.token));
    const scoredTokens = uniqueTokens
      .map((candidate) => {
        const normalizedCandidate = normalizeForm(candidate);
        const exactSupport = tokens.filter((item) => normalizeForm(item.token) === normalizedCandidate).length;
        const averageSimilarity = tokens.reduce((sum, item) => sum + similarity(candidate, item.token), 0) / tokens.length;
        return {
          token: candidate,
          score: exactSupport * 2 + averageSimilarity,
          source: tokens.find((item) => normalizeForm(item.token) === normalizedCandidate) ?? tokens[0],
        };
      })
      .sort((left, right) => right.score - left.score || simplifiedForm(left.token).length - simplifiedForm(right.token).length);
    return scoredTokens[0];
  });

  const form = selected.map((item) => item.token).join(' ');
  const sourceForms = new Set(selected.map((item) => item.source.sourceForm));
  const sourceLanguages = [...new Set(selected.map((item) => item.source.language))];

  return {
    form,
    isComposite: sourceForms.size > 1,
    sourceLanguages,
  };
}

function groupVariants(nufiForms: string[], contributions: WordComparisonContribution[]) {
  const grouped = new Map<string, SynthesisVariant>();

  if (nufiForms.length) {
    grouped.set('nufi', {
      language: 'nufi',
      label: getLanguageLabel('nufi'),
      forms: uniqueForms(nufiForms),
    });
  }

  for (const contribution of contributions) {
    if (!SYNTHESIS_LANGUAGE_IDS.has(contribution.language)) continue;
    const current = grouped.get(contribution.language) ?? {
      language: contribution.language,
      label: getLanguageLabel(contribution.language),
      forms: [],
    };
    current.forms = uniqueForms([...current.forms, contribution.translation, contribution.synonyms]);
    grouped.set(contribution.language, current);
  }

  return [...grouped.values()].filter((variant) => variant.forms.length > 0);
}

function synthesize(variants: SynthesisVariant[]): SynthesisResult {
  const formsByLanguage = variants.flatMap((variant) =>
    variant.forms.map((form) => ({
      form,
      language: variant.label,
      normalized: normalizeForm(form),
      shape: syllableShape(form),
    }))
  );
  const unique = uniqueForms(formsByLanguage.map((item) => item.form));

  if (unique.length === 0) {
    return {
      proposed: '-',
      simplified: '-',
      isComposite: false,
      confidence: 'Faible',
      expertReview: 'Oui: aucune variante exploitable.',
      analysis: 'Aucune forme exploitable dans les variantes disponibles.',
      justification: 'La synthese ne peut pas etre proposee sans formes observees.',
      options: [],
    };
  }

  const composite = buildCompositeCandidate(formsByLanguage);
  const candidateForms = uniqueForms(composite ? [...unique, composite.form] : unique);

  const scored = candidateForms
    .map((candidate) => {
      const normalizedCandidate = normalizeForm(candidate);
      const exactSupport = formsByLanguage.filter((item) => item.normalized === normalizedCandidate).length;
      const averageSimilarity =
        formsByLanguage.reduce((sum, item) => sum + similarity(candidate, item.form), 0) / Math.max(1, formsByLanguage.length);
      const languageSupport = new Set(
        formsByLanguage.filter((item) => similarity(candidate, item.form) >= 0.72).map((item) => item.language)
      ).size;
      const isComposite = Boolean(composite && normalizeForm(composite.form) === normalizedCandidate && composite.isComposite);
      return {
        form: candidate,
        score: exactSupport * 2 + languageSupport * 1.5 + averageSimilarity + (isComposite ? 1.25 : 0),
        exactSupport,
        languageSupport,
        averageSimilarity,
        isComposite,
      };
    })
    .sort((left, right) => right.score - left.score || simplifiedForm(left.form).length - simplifiedForm(right.form).length);

  const topObserved = scored[0];
  const compositeScored = scored.find((item) => item.isComposite);
  const best =
    compositeScored &&
    compositeScored.score >= topObserved.score - 1.5 &&
    compositeScored.languageSupport >= topObserved.languageSupport - 1
      ? compositeScored
      : topObserved;
  const rankedOptions = [best, ...scored.filter((item) => item.form !== best.form)];
  const second = rankedOptions[1];
  const initials = formsByLanguage.map((item) => item.normalized.charAt(0)).filter(Boolean);
  const commonInitial = mostCommon(initials);
  const shapes = formsByLanguage.map((item) => item.shape).filter(Boolean);
  const commonShape = mostCommon(shapes);
  const closeFamilies = formsByLanguage.filter((item) => similarity(best.form, item.form) >= 0.72);
  const familyLanguages = [...new Set(closeFamilies.map((item) => item.language))];
  const averageSimilarity = best.averageSimilarity;
  const confidence =
    variants.length >= 4 && best.languageSupport >= 3 && averageSimilarity >= 0.68
      ? 'Eleve'
      : variants.length >= 3 && best.languageSupport >= 2 && averageSimilarity >= 0.5
        ? 'Moyen'
        : 'Faible';

  const options = rankedOptions.slice(0, 3).map((item) => {
    const limit =
      second && item.form === best.form && Math.abs(best.score - second.score) < 1
        ? 'option forte, mais proche de la seconde option'
        : item.form === best.form
          ? 'meilleur centre phonologique observe'
          : 'option secondaire';
    const source = item.isComposite ? 'forme composite' : limit;
    return `${item.form} (${item.languageSupport} langues proches, ${source})`;
  });

  return {
    proposed: best.form,
    simplified: simplifiedForm(best.form),
    isComposite: best.isComposite,
    confidence,
    expertReview:
      confidence === 'Eleve'
        ? 'Non prioritaire, mais validation communautaire recommandee.'
        : 'Oui: a soumettre a des linguistes et personnes ressources.',
    analysis: [
      best.isComposite
        ? `La forme proposee est composite: elle assemble les segments les plus forts observes dans plusieurs variantes proches.`
        : `La forme proposee est le centre le plus proche des variantes disponibles selon la proximite phonologique.`,
      commonInitial ? `L'attaque initiale la plus frequente est "${commonInitial[0]}".` : '',
      commonShape ? `La structure syllabique dominante est ${commonShape[0]}.` : '',
      familyLanguages.length ? `Les formes les plus proches couvrent: ${familyLanguages.join(', ')}.` : '',
      best.isComposite && composite?.sourceLanguages.length
        ? `Les segments retenus proviennent notamment de: ${composite.sourceLanguages.join(', ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
    justification: best.isComposite
      ? `Cette forme garde les segments les plus reconnaissables tout en restant simple a ecrire. Elle n'est pas une invention libre: chaque segment vient des variantes observees, puis l'ensemble est compose comme compromis entre frequence, proximite et facilite d'adoption.`
      : `Cette forme garde les segments les plus reconnaissables tout en restant simple a ecrire. Elle n'est pas une invention libre: elle est choisie parmi les formes observees et sert de compromis entre frequence, proximite et facilite d'adoption.`,
    options,
  };
}

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function SynthesePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const data = await listComparisonWords({ q: query, limit: PAGE_SIZE, offset });
  const pageEnd = Math.min(offset + data.rows.length, data.total);
  const canGoPrevious = page > 1;
  const canGoNext = pageEnd < data.total;

  return (
    <main className="min-h-screen bg-[#f4f3ed] text-[#151a16]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 rounded-md border border-[#cfd2c3] bg-white px-3 py-2 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
          >
            <ArrowLeft className="h-4 w-4" />
            Comparaison
          </Link>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f6b58]">Synthese linguistique</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-[#151a16] md:text-5xl">
                Langue bamiléké unifiée
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#5f665d]">
                Proposition de formes communes a partir des variantes observees dans le corpus. Les variantes restent en noir;
                la synthese proposee est affichee en vert.
              </p>
            </div>
            <div className="rounded-xl border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm">
              <p className="text-2xl font-black text-[#2f6b58]">{data.total}</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667065]">entrees comparables</p>
            </div>
          </div>
          <form className="mt-6 flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white p-2 shadow-sm sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Rechercher un mot francais, anglais ou une variante"
                className="h-12 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base outline-none transition focus:border-[#2f6b58] focus:bg-white"
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#2f6b58] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#245746]">
              <Search className="h-5 w-5" />
              Rechercher
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#62685d]">
            {data.total === 0 ? 'Aucune entree trouvee' : `${offset + 1}-${pageEnd} sur ${data.total}`}
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={!canGoPrevious}
              href={canGoPrevious ? `/synthese?q=${encodeURIComponent(query)}&page=${page - 1}` : '#'}
              className={`inline-flex h-10 items-center gap-2 rounded-md border border-[#c9cabc] bg-white px-3 text-sm font-semibold ${
                canGoPrevious ? 'text-[#344437] hover:border-[#2f6b58]' : 'pointer-events-none text-[#9ca197] opacity-50'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Link>
            <Link
              aria-disabled={!canGoNext}
              href={canGoNext ? `/synthese?q=${encodeURIComponent(query)}&page=${page + 1}` : '#'}
              className={`inline-flex h-10 items-center gap-2 rounded-md border border-[#c9cabc] bg-white px-3 text-sm font-semibold ${
                canGoNext ? 'text-[#344437] hover:border-[#2f6b58]' : 'pointer-events-none text-[#9ca197] opacity-50'
              }`}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6">
          {data.rows.map((word) => {
            const variants = groupVariants(word.nufi_json, data.contributionsByWordId.get(word.id) ?? []);
            const synthesis = synthesize(variants);
            const otherVariants = variants.filter((variant) => !['nufi', 'ghomala', 'yemba', 'medumba'].includes(variant.language));

            return (
              <article key={word.id} className="overflow-hidden rounded-xl border border-[#d8d6c8] bg-white shadow-sm">
                <div className="border-b border-[#e5e1d6] bg-[#fbfaf6] px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#667065]">Mot francais / anglais</p>
                  <h2 className="mt-2 text-2xl font-semibold text-black">{displayText(word.french)}</h2>
                  <p className="mt-1 text-base font-medium text-[#30352f]">{displayText(word.english)}</p>
                </div>
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                  <div className="border-b border-[#e5e1d6] p-5 lg:border-b-0 lg:border-r">
                    <h3 className="text-lg font-semibold text-black">Variantes observées</h3>
                    <div className="mt-4 grid gap-3">
                      {['nufi', 'ghomala', 'yemba', 'medumba'].map((language) => {
                        const variant = variants.find((item) => item.language === language);
                        return (
                          <div key={language} className="grid gap-1 rounded-lg border border-[#e8e3d7] bg-white px-4 py-3 sm:grid-cols-[150px_1fr]">
                            <p className="font-semibold text-black">{getLanguageLabel(language)} :</p>
                            <p className="text-lg font-semibold text-black">{variant ? variant.forms.join(' ; ') : '-'}</p>
                          </div>
                        );
                      })}
                      <div className="rounded-lg border border-[#e8e3d7] bg-white px-4 py-3">
                        <p className="font-semibold text-black">Autres variantes :</p>
                        <div className="mt-2 grid gap-2">
                          {otherVariants.length ? (
                            otherVariants.map((variant) => (
                              <p key={variant.language} className="text-black">
                                <span className="font-semibold">{variant.label} :</span> {variant.forms.join(' ; ')}
                              </p>
                            ))
                          ) : (
                            <p className="text-black">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="bg-[#f3faf6] p-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#b8d5c7] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#2f6b58]">
                      <Sparkles className="h-4 w-4" />
                      Synthese
                    </div>
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-[#2f6b58]">Forme unifiée proposée</p>
                    <p className="mt-2 text-4xl font-black leading-tight text-[#147a4f]">{synthesis.proposed}</p>
                    {synthesis.isComposite ? (
                      <p className="mt-2 inline-flex rounded-full border border-[#b8d5c7] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#147a4f]">
                        Forme composite
                      </p>
                    ) : null}
                    <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-[#2f6b58]">Forme simplifiée</p>
                    <p className="mt-2 text-2xl font-semibold text-[#147a4f]">{synthesis.simplified}</p>
                    <div className="mt-5 grid gap-2 text-sm font-semibold text-[#147a4f]">
                      <p>Niveau de confiance : {synthesis.confidence}</p>
                      <p>Cas nécessitant l'avis des experts : {synthesis.expertReview}</p>
                    </div>
                  </aside>
                </div>

                <div className="grid gap-5 border-t border-[#e5e1d6] p-5 lg:grid-cols-3">
                  <section>
                    <h3 className="text-base font-bold text-black">Analyse linguistique</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-black">{synthesis.analysis}</p>
                  </section>
                  <section>
                    <h3 className="text-base font-bold text-black">Choix possibles</h3>
                    <ul className="mt-2 grid gap-2 text-sm font-medium leading-6 text-black">
                      {synthesis.options.length ? synthesis.options.map((option) => <li key={option}>{option}</li>) : <li>-</li>}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-base font-bold text-black">Justification</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-black">{synthesis.justification}</p>
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
