'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Search } from 'lucide-react';
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
  notes: string;
  createdAt: number;
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

export function CompareWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
  const t = useUiText();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CompareResponse>({ rows: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showContributors, setShowContributors] = useState(false);
  const [message, setMessage] = useState('');

  const comparisonLanguages = useMemo(() => languages.filter((language) => language.id !== 'other'), [languages]);
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

  function latestContributionFor(word: ComparisonWord, languageId: string) {
    return word.contributions.find((item) => item.language === languageId);
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

    const contribution = latestContributionFor(word, language.id);
    if (!contribution) return <span className="text-[#a1a498]">-</span>;

    return (
      <div className="grid gap-1">
        <p className="text-base font-semibold leading-snug text-[#20231f]">{contribution.translation}</p>
        {contribution.synonyms ? <p className="text-xs leading-snug text-[#62685d]">{contribution.synonyms}</p> : null}
        {showContributors ? (
          <p className="text-xs font-medium text-[#7a7f73]">{contribution.contributorName || '-'}</p>
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
            <button
              type="button"
              onClick={() => setShowContributors((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-4 text-sm font-semibold text-[#344437] shadow-sm transition hover:border-[#295f4e] lg:self-end"
            >
              {showContributors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showContributors ? t.hideNames : t.showNames}
            </button>
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

        {message ? <p className="mb-4 rounded-md border border-[#e4c7b3] bg-[#fff8f3] px-4 py-3 text-[#7a3d2f]">{message}</p> : null}

        {isLoading ? (
          <div className="h-96 animate-pulse rounded-xl border border-[#deddd2] bg-white shadow-sm" />
        ) : data.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c4c7b8] bg-white px-5 py-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-[#20231f]">{t.noComparisonRows}</p>
            <p className="mt-2 text-[#62685d]">{t.savedTranslationsWillAppear}</p>
          </div>
        ) : (
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
        )}
      </section>
    </main>
  );
}
