import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listComparisonWords, type WordComparisonContribution } from '@/lib/db';
import { customLanguageLabel, getLanguageLabel, LANGUAGES } from '@/lib/languages';

type ExportWord = Awaited<ReturnType<typeof listComparisonWords>>['rows'][number] & {
  contributions: WordComparisonContribution[];
};

const EXPORT_PAGE_SIZE = 80;

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: unknown[]) {
  return values.map(csvValue).join(',');
}

function normalizeEntry(value: string | undefined) {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase()}`);
}

function displayList(values: string[]) {
  return values.map(normalizeEntry).filter(Boolean).join(' / ');
}

function languageLabel(languageId: string) {
  const label = getLanguageLabel(languageId);
  return label === languageId ? customLanguageLabel(languageId) : label;
}

function contributionTime(contribution: WordComparisonContribution | undefined) {
  return contribution ? new Date(contribution.created_at).getTime() : 0;
}

function displayContributionFor(word: ExportWord, languageId: string) {
  const approved = word.contributions.find((item) => item.language === languageId && item.status === 'approved');
  const pending = word.contributions.find((item) => item.language === languageId && item.status === 'pending');
  if (!approved) return pending ?? null;
  if (!pending) return approved;
  return contributionTime(pending) > contributionTime(approved) ? pending : approved;
}

function formatContributionDate(contribution: WordComparisonContribution | null) {
  if (!contribution) return '';
  const date = new Date(contribution.created_at);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function buildLanguageOrder(words: ExportWord[]) {
  const known: { id: string; label: string }[] = LANGUAGES.filter((language) => language.id !== 'other').map((language) => ({
    id: language.id,
    label: language.label,
  }));
  const knownIds = new Set(known.map((language) => language.id));
  const baseOrder = new Map(known.map((language, index) => [language.id, index]));
  const contributionCounts = new Map<string, number>();
  const extraIds = new Set<string>();

  for (const word of words) {
    if (word.nufi_json.length > 0) contributionCounts.set('nufi', (contributionCounts.get('nufi') ?? 0) + 1);
    for (const contribution of word.contributions) {
      contributionCounts.set(contribution.language, (contributionCounts.get(contribution.language) ?? 0) + 1);
      if (!knownIds.has(contribution.language) && contribution.language !== 'other') extraIds.add(contribution.language);
    }
  }

  return [
    ...known,
    ...[...extraIds].sort().map((id) => ({ id, label: languageLabel(id) })),
  ].sort((left, right) => {
    const leftCount = contributionCounts.get(left.id) ?? 0;
    const rightCount = contributionCounts.get(right.id) ?? 0;
    if (leftCount && !rightCount) return -1;
    if (!leftCount && rightCount) return 1;
    if (leftCount !== rightCount) return rightCount - leftCount;

    const leftOrder = baseOrder.get(left.id);
    const rightOrder = baseOrder.get(right.id);
    if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
    if (leftOrder !== undefined) return -1;
    if (rightOrder !== undefined) return 1;
    return left.label.localeCompare(right.label);
  });
}

function fileSafe(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const words: ExportWord[] = [];
  let offset = 0;
  let total = 0;

  do {
    const result = await listComparisonWords({ q, offset, limit: EXPORT_PAGE_SIZE });
    total = result.total;
    words.push(
      ...result.rows.map((word) => ({
        ...word,
        contributions: result.contributionsByWordId.get(word.id) ?? [],
      }))
    );
    offset += result.rows.length;
  } while (offset < total);

  const languages = buildLanguageOrder(words);
  const header = [
    'word_id',
    'french',
    'english',
    'nufi',
    'contribution_count',
    ...languages
      .filter((language) => language.id !== 'nufi')
      .flatMap((language) => [
        `${language.label} translation`,
        `${language.label} synonyms`,
        `${language.label} status`,
        `${language.label} contributor`,
        `${language.label} submitted_at`,
        `${language.label} notes`,
      ]),
  ];

  const rows = words.map((word) =>
    csvRow([
      word.id,
      normalizeEntry(word.french),
      normalizeEntry(word.english),
      displayList(word.nufi_json),
      word.contribution_count,
      ...languages
        .filter((language) => language.id !== 'nufi')
        .flatMap((language) => {
          const contribution = displayContributionFor(word, language.id);
          return [
            normalizeEntry(contribution?.translation),
            normalizeEntry(contribution?.synonyms),
            contribution?.status ?? '',
            contribution?.contributor_name?.trim() || contribution?.contributor_email?.trim() || '',
            formatContributionDate(contribution),
            normalizeEntry(contribution?.notes),
          ];
        }),
    ])
  );

  const suffix = q ? `-${fileSafe(q)}` : '';
  const csv = [csvRow(header), ...rows].join('\r\n');
  return new NextResponse(`\uFEFF${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="comparison-table${suffix}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
