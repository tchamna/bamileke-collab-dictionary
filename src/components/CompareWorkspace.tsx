'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Eye, EyeOff, Search } from 'lucide-react';
import { customLanguageLabel, getLanguageLabel } from '@/lib/languages';
import { useUiText } from '@/lib/uiLocale';

type LanguageOption = {
  id: string;
  label: string;
};

type ComparisonContribution = {
  id: number;
  language: string;
  translation: string;
  synonyms: string;
  contributorName: string;
  contributorEmail: string;
  notes: string;
  status: string;
  createdAt: string;
};

type ComparisonWord = {
  id: number;
  french: string;
  english: string;
  nufi: string[];
  languageCount: number;
  contributionCount: number;
  contributions: ComparisonContribution[];
};

type CompareResponse = {
  rows: ComparisonWord[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;
type CompareView = 'horizontal' | 'vertical';

export function CompareWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
  const t = useUiText();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CompareResponse>({ rows: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showContributors, setShowContributors] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [viewMode, setViewMode] = useState<CompareView>('horizontal');
  const [message, setMessage] = useState('');

  const comparisonLanguages = useMemo(() => {
    const known = languages.filter((language) => language.id !== 'other');
    const knownIds = new Set(known.map((language) => language.id));
    const baseOrder = new Map(known.map((language, index) => [language.id, index]));
    const contributionCounts = new Map<string, number>();
    const extraIds = new Set<string>();

    for (const word of data.rows) {
      if (word.nufi.length > 0) {
        contributionCounts.set('nufi', (contributionCounts.get('nufi') ?? 0) + 1);
      }

      for (const contribution of word.contributions) {
        contributionCounts.set(contribution.language, (contributionCounts.get(contribution.language) ?? 0) + 1);
        if (!knownIds.has(contribution.language) && contribution.language !== 'other') {
          extraIds.add(contribution.language);
        }
      }
    }

    const allLanguages = [
      ...known,
      ...[...extraIds].sort().map((id) => ({
        id,
        label: getLanguageLabel(id) === id ? customLanguageLabel(id) : getLanguageLabel(id),
      })),
    ];

    return allLanguages.sort((left, right) => {
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
  }, [data.rows, languages]);
  const pageEnd = Math.min(offset + data.rows.length, data.total);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`/api/compare?q=${encodeURIComponent(activeQuery)}&offset=${offset}&limit=${PAGE_SIZE}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((payload: CompareResponse) => {
        setData(payload);
        setMessage('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setMessage(t.unableToLoadComparison);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [activeQuery, offset, t.unableToLoadComparison]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOffset(0);
      setActiveQuery(query.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  function search(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setActiveQuery(query.trim());
  }

  function contributionTime(contribution: ComparisonContribution | undefined) {
    return contribution ? new Date(contribution.createdAt).getTime() : 0;
  }

  function formatContributionDate(contribution: ComparisonContribution) {
    const date = new Date(contribution.createdAt);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function latestApprovedForLanguage(word: ComparisonWord, languageId: string) {
    return word.contributions.find((item) => item.language === languageId && item.status === 'approved');
  }

  function latestPendingForLanguage(word: ComparisonWord, languageId: string) {
    return word.contributions.find((item) => item.language === languageId && item.status === 'pending');
  }

  function displayContributionFor(word: ComparisonWord, languageId: string) {
    return latestApprovedForLanguage(word, languageId) ?? latestPendingForLanguage(word, languageId);
  }

  function pendingCorrectionFor(word: ComparisonWord, languageId: string) {
    const approved = latestApprovedForLanguage(word, languageId);
    const pending = latestPendingForLanguage(word, languageId);

    if (!approved || !pending) return null;
    return contributionTime(pending) > contributionTime(approved) ? pending : null;
  }

  function contributionsForLanguage(word: ComparisonWord, languageId: string) {
    return word.contributions.filter((item) => item.language === languageId);
  }

  function contributionDetailsForLanguage(word: ComparisonWord, languageId: string) {
    const contributions = contributionsForLanguage(word, languageId);
    if (contributions.length === 0) return '-';

    return contributions
      .map((contribution) => {
        const name = contribution.contributorName.trim() || contribution.contributorEmail.trim() || '-';
        const date = `${t.submittedAt}: ${formatContributionDate(contribution)}`;
        if (showContributors && showDates) return `${name} · ${date}`;
        if (showContributors) return name;
        if (showDates) return date;
        return contribution.notes || '-';
      })
      .join('\n');
  }

  function contributionMeta(contribution: ComparisonContribution) {
    const name = contribution.contributorName.trim() || contribution.contributorEmail.trim();
    const parts = [];
    if (showContributors) parts.push(name || '-');
    if (showDates) parts.push(`${t.submittedAt}: ${formatContributionDate(contribution)}`);
    return parts.join(' · ');
  }

  function renderLanguageCell(word: ComparisonWord, language: LanguageOption) {
    if (language.id === 'nufi') {
      return (
        <div className="grid gap-1">
          <p className="text-base font-semibold leading-snug text-[#20231f]">{word.nufi.join(' / ') || '-'}</p>
          <p className="text-xs font-medium text-[#7a7f73]">{t.nufiImportReference}</p>
        </div>
      );
    }

    const contribution = displayContributionFor(word, language.id);
    const pendingCorrection = pendingCorrectionFor(word, language.id);
    if (!contribution) return <span className="text-[#a1a498]">-</span>;

    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold leading-snug text-[#20231f]">{contribution.translation}</p>
          {contribution.status === 'pending' ? (
            <span className="rounded-full border border-[#d7b867] bg-[#fff8df] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#7a5a09]">
              {t.pending}
            </span>
          ) : null}
        </div>
        {contribution.synonyms ? <p className="text-xs leading-snug text-[#62685d]">{contribution.synonyms}</p> : null}
        {pendingCorrection ? (
          <div className="rounded-md border border-[#eadca9] bg-[#fffaf0] px-2.5 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a5a09]">{t.pendingCorrection}</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-[#20231f]">{pendingCorrection.translation}</p>
            {pendingCorrection.synonyms ? <p className="mt-1 text-xs leading-snug text-[#62685d]">{pendingCorrection.synonyms}</p> : null}
            {showContributors || showDates ? (
              <p className="mt-1 text-xs font-medium text-[#7a7f73]">{contributionMeta(pendingCorrection)}</p>
            ) : null}
          </div>
        ) : null}
        {showContributors || showDates ? (
          <p className="text-xs font-medium text-[#7a7f73]">{contributionMeta(contribution)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f3ed] text-[#20231f]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-md border border-[#cfd2c3] bg-white px-3 py-2 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.contributionForm}
              </a>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6f67]">{t.comparison}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#20231f] md:text-4xl">{t.comparisonTitle}</h1>
              <p className="mt-3 text-base font-medium text-[#62685d]">
                {isLoading ? t.loadingTranslations : t.comparisonSummary(data.total, comparisonLanguages.length)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:self-end">
              <button
                type="button"
                onClick={() => setShowContributors((value) => !value)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-4 text-sm font-semibold text-[#344437] shadow-sm transition hover:border-[#295f4e]"
              >
                {showContributors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showContributors ? t.hideNames : t.showNames}
              </button>
              <button
                type="button"
                onClick={() => setShowDates((value) => !value)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-4 text-sm font-semibold text-[#344437] shadow-sm transition hover:border-[#295f4e]"
              >
                <CalendarClock className="h-4 w-4" />
                {showDates ? t.hideDates : t.showDates}
              </button>
            </div>
          </div>
          <form onSubmit={search} className="flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white p-2 shadow-sm sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-12 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base outline-none transition focus:border-[#295f4e] focus:bg-white"
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#1f4b3d]">
              <Search className="h-5 w-5" />
              {t.search}
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#5e6459]">
            {isLoading ? t.loadingTranslations : data.total === 0 ? t.noTranslatedWordsYet : `${offset + 1}-${pageEnd} ${t.of} ${data.total}`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg border border-[#d8d6c8] bg-[#fbfaf6] p-1" role="tablist" aria-label={t.comparison}>
              {[
                { id: 'horizontal' as const, label: t.wordsAsRows },
                { id: 'vertical' as const, label: t.languagesAsRows },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === view.id}
                  onClick={() => setViewMode(view.id)}
                  className={`h-9 rounded-md px-3 text-sm font-semibold transition ${
                    viewMode === view.id
                      ? 'bg-[#295f4e] text-white shadow-sm'
                      : 'text-[#596056] hover:bg-white hover:text-[#295f4e]'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                aria-label={t.previousPage}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c9cabc] bg-[#fbfaf6] text-[#344437] transition hover:border-[#295f4e] disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= data.total}
                aria-label={t.nextPage}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c9cabc] bg-[#fbfaf6] text-[#344437] transition hover:border-[#295f4e] disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {message ? <p className="mb-4 rounded-md border border-[#e4c7b3] bg-[#fff8f3] px-4 py-3 text-[#7a3d2f]">{message}</p> : null}

        {isLoading ? (
          <div className="h-96 animate-pulse rounded-xl border border-[#deddd2] bg-white shadow-sm" />
        ) : data.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c4c7b8] bg-white px-5 py-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-[#20231f]">{t.noComparisonRows}</p>
            <p className="mt-2 text-[#62685d]">{t.savedTranslationsWillAppear}</p>
          </div>
        ) : viewMode === 'horizontal' ? (
          <div className="overflow-hidden rounded-xl border border-[#d8d6c8] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e4e2d8] bg-[#fbfaf6]">
                    <th className="w-64 bg-[#f4f3ed] px-4 py-4 text-sm font-semibold text-[#111611]">English</th>
                    <th className="w-72 px-4 py-4 text-sm font-semibold text-[#111611]">French</th>
                    {comparisonLanguages.map((language) => (
                      <th key={language.id} className="min-w-48 px-4 py-4 text-sm font-semibold text-[#111611]">
                        {language.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#ebe9df] bg-[#fbfaf6]">
                    <td colSpan={2 + comparisonLanguages.length} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#777d72]">
                      {t.bamilekeVersions}
                    </td>
                  </tr>
                  {data.rows.map((word) => (
                    <tr key={word.id} className="border-b border-[#ebe9df] last:border-b-0">
                      <td className="bg-white px-4 py-5 align-top">
                        <p className="text-lg font-semibold leading-snug text-[#111611]">{word.english || '-'}</p>
                        <p className="mt-2 text-sm font-medium text-[#7a7f73]">
                          {word.contributionCount} {t.contributions}
                        </p>
                      </td>
                      <td className="px-4 py-5 align-top text-base font-medium leading-snug text-[#62685d]">{word.french}</td>
                      {comparisonLanguages.map((language) => (
                        <td key={language.id} className="px-4 py-5 align-top">
                          {renderLanguageCell(word, language)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            {data.rows.map((word) => (
              <article key={word.id} className="overflow-hidden rounded-xl border border-[#d8d6c8] bg-white shadow-sm">
                <div className="grid border-b border-[#ebe9df] bg-[#fbfaf6] md:grid-cols-2">
                  <div className="border-b border-[#ebe9df] px-5 py-4 md:border-b-0 md:border-r">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#777d72]">{t.english}</p>
                    <p className="mt-2 text-xl font-semibold leading-snug text-[#111611]">{word.english || '-'}</p>
                    <p className="mt-2 text-sm font-medium text-[#7a7f73]">
                      {word.contributionCount} {t.contributions}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#777d72]">{t.french}</p>
                    <p className="mt-2 text-xl font-semibold leading-snug text-[#111611]">{word.french}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#ebe9df] bg-white">
                        <th className="w-64 px-5 py-3 text-sm font-semibold text-[#111611]">{t.language}</th>
                        <th className="px-5 py-3 text-sm font-semibold text-[#111611]">{t.translation}</th>
                        <th className="w-80 px-5 py-3 text-sm font-semibold text-[#111611]">
                          {showContributors || showDates ? t.contributor : t.notes}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonLanguages.map((language) => {
                        const contribution = displayContributionFor(word, language.id);
                        return (
                          <tr key={language.id} className="border-b border-[#ebe9df] last:border-b-0">
                            <td className="bg-[#fbfaf6] px-5 py-4 align-top text-sm font-semibold text-[#295f4e]">
                              {language.label}
                            </td>
                            <td className="px-5 py-4 align-top">{renderLanguageCell(word, language)}</td>
                            <td className="whitespace-pre-line px-5 py-4 align-top text-sm leading-relaxed text-[#62685d]">
                              {language.id === 'nufi'
                                ? t.nufiImportReference
                                : showContributors || showDates
                                  ? contributionDetailsForLanguage(word, language.id)
                                  : contribution?.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
