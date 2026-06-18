'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Languages, Search, UsersRound } from 'lucide-react';
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

const PAGE_SIZE = 20;

export function CompareWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
  const t = useUiText();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CompareResponse>({ rows: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showContributors, setShowContributors] = useState(false);
  const [message, setMessage] = useState('');

  const languageLabelById = useMemo(() => new Map(languages.map((item) => [item.id, item.label])), [languages]);
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

  return (
    <main className="min-h-screen bg-[#f4f3ed] text-[#20231f]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-md border border-[#cfd2c3] bg-white px-3 py-2 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.contributionForm}
              </a>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6f67]">{t.comparison}</p>
              <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-[#20231f] md:text-5xl">
                {t.comparisonTitle}
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-80">
              <div className="rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-[#596056]">
                  <Languages className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wide">{t.translatedWords}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#20231f]">{isLoading ? '--' : data.total}</p>
              </div>
              <div className="rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-[#596056]">
                  <UsersRound className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-wide">{t.shown}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#20231f]">{isLoading ? '--' : data.rows.length}</p>
              </div>
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

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[#5e6459]">
            {isLoading ? t.loadingTranslations : data.total === 0 ? t.noTranslatedWordsYet : `${offset + 1}-${pageEnd} ${t.of} ${data.total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowContributors((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-[#fbfaf6] px-3 text-sm font-semibold text-[#344437] transition hover:border-[#295f4e]"
            >
              {showContributors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showContributors ? t.hideNames : t.showNames}
            </button>
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
          <div className="grid gap-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-48 animate-pulse rounded-lg border border-[#deddd2] bg-white" />
            ))}
          </div>
        ) : data.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#c4c7b8] bg-white px-5 py-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-[#20231f]">{t.noComparisonRows}</p>
            <p className="mt-2 text-[#62685d]">{t.savedTranslationsWillAppear}</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {data.rows.map((word) => (
              <article key={word.id} className="overflow-hidden rounded-lg border border-[#d8d6c8] bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[minmax(260px,360px)_1fr]">
                  <div className="border-b border-[#ebe9df] bg-[#fbfaf6] p-5 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#687064]">{t.french}</p>
                    <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#20231f]">{word.french}</h2>
                    {word.english ? <p className="mt-2 text-sm text-[#62685d]">{t.english}: {word.english}</p> : null}
                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#e6efe9] px-3 py-1 text-sm font-semibold text-[#295f4e]">
                        {word.languageCount + (word.nufi.length ? 1 : 0)} {t.languages}
                      </span>
                      <span className="rounded-full bg-[#f1e8d6] px-3 py-1 text-sm font-semibold text-[#6d5121]">
                        {word.contributionCount} {t.contributions}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#687064]">
                        {t.bamilekeVersions}
                      </h3>
                      <p className="text-sm font-medium text-[#62685d]">{word.contributions.length} {t.rows}</p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-[#dfded2]">
                      <table className="w-full min-w-[760px] border-collapse bg-white text-left">
                        <thead className="bg-[#eef1e8]">
                          <tr>
                            <th className="w-44 border-b border-[#d8d6c8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#596056]">
                              {t.language}
                            </th>
                            <th className="border-b border-[#d8d6c8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#596056]">
                              {t.translation}
                            </th>
                            <th className="border-b border-[#d8d6c8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#596056]">
                              {t.synonyms}
                            </th>
                            <th className="border-b border-[#d8d6c8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#596056]">
                              {t.notes}
                            </th>
                            {showContributors ? (
                              <th className="w-40 border-b border-[#d8d6c8] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#596056]">
                                {t.contributor}
                              </th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {word.nufi.length ? (
                            <tr className="border-b border-[#ecebe2]">
                              <td className="bg-[#fbfaf6] px-4 py-4 align-top text-sm font-semibold text-[#295f4e]">
                                Nufi
                              </td>
                              <td className="px-4 py-4 align-top text-xl font-semibold leading-snug text-[#20231f]">
                                {word.nufi.join(' / ')}
                              </td>
                              <td className="px-4 py-4 align-top text-sm leading-relaxed text-[#596056]">
                                <span className="text-[#9a9e92]">-</span>
                              </td>
                              <td className="px-4 py-4 align-top text-sm leading-relaxed text-[#596056]">
                                {t.nufiImportReference}
                              </td>
                              {showContributors ? (
                                <td className="px-4 py-4 align-top text-sm font-medium text-[#596056]">
                                  <span className="text-[#9a9e92]">-</span>
                                </td>
                              ) : null}
                            </tr>
                          ) : null}
                          {word.contributions.map((item) => (
                            <tr key={item.id} className="border-b border-[#ecebe2] last:border-b-0">
                              <td className="bg-[#fbfaf6] px-4 py-4 align-top text-sm font-semibold text-[#295f4e]">
                                {languageLabelById.get(item.language) ?? item.language}
                              </td>
                              <td className="px-4 py-4 align-top text-xl font-semibold leading-snug text-[#20231f]">
                                {item.translation}
                              </td>
                              <td className="px-4 py-4 align-top text-sm leading-relaxed text-[#596056]">
                                {item.synonyms || <span className="text-[#9a9e92]">-</span>}
                              </td>
                              <td className="px-4 py-4 align-top text-sm leading-relaxed text-[#596056]">
                                {item.notes || <span className="text-[#9a9e92]">-</span>}
                              </td>
                              {showContributors ? (
                                <td className="px-4 py-4 align-top text-sm font-medium text-[#596056]">
                                  {item.contributorName || <span className="text-[#9a9e92]">-</span>}
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
