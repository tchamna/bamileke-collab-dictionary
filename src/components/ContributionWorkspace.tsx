'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Languages, LibraryBig, Rows3, Save, Search, Sparkles } from 'lucide-react';
import { useUiText } from '@/lib/uiLocale';

type LanguageOption = {
  id: string;
  label: string;
};

type WordItem = {
  id: number;
  french: string;
  english: string;
  nufi: string[];
  contributionCount: number;
  latestTranslation: string | null;
  latestSynonyms: string | null;
};

type ApiResponse = {
  rows: WordItem[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 18;
const CONTRIBUTOR_NAME_STORAGE_KEY = 'bamilekeContributorName';

export function ContributionWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
  const t = useUiText();
  const [language, setLanguage] = useState('ghomala');
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ApiResponse>({ rows: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [translation, setTranslation] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`/api/words?language=${encodeURIComponent(language)}&q=${encodeURIComponent(activeQuery)}&offset=${offset}&limit=${PAGE_SIZE}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => response.json())
      .then((payload: ApiResponse) => {
        setData(payload);
        setSelectedWordId((current) => {
          if (current && payload.rows.some((word) => word.id === current)) return current;
          return payload.rows[0]?.id ?? null;
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setMessage(t.unableToLoadWords);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [language, activeQuery, offset, t.unableToLoadWords]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOffset(0);
      setActiveQuery(query.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const storedName = window.sessionStorage.getItem(CONTRIBUTOR_NAME_STORAGE_KEY);
    if (storedName) setContributorName(storedName);
  }, []);

  useEffect(() => {
    const trimmedName = contributorName.trim();
    if (trimmedName) {
      window.sessionStorage.setItem(CONTRIBUTOR_NAME_STORAGE_KEY, trimmedName);
    } else {
      window.sessionStorage.removeItem(CONTRIBUTOR_NAME_STORAGE_KEY);
    }
  }, [contributorName]);

  const selectedWord = useMemo(
    () => data.rows.find((word) => word.id === selectedWordId) ?? data.rows[0] ?? null,
    [data.rows, selectedWordId]
  );
  const selectedLanguageLabel = languages.find((item) => item.id === language)?.label ?? language;
  const pageEnd = Math.min(offset + data.rows.length, data.total);
  const completedOnPage = data.rows.filter((word) => word.latestTranslation).length;

  function selectWord(word: WordItem) {
    setSelectedWordId(word.id);
    setTranslation(word.latestTranslation ?? '');
    setSynonyms(word.latestSynonyms ?? '');
    setNotes('');
    setMessage('');
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setActiveQuery(query.trim());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedWord) return;
    setIsSaving(true);
    setMessage('');

    const response = await fetch('/api/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordId: selectedWord.id,
        language,
        translation,
        synonyms,
        contributorName,
        notes,
      }),
    });

    setIsSaving(false);
    if (!response.ok) {
      setMessage(t.addTranslationFirst);
      return;
    }

    setMessage(t.saved);
    setData((current) => ({
      ...current,
      rows: current.rows.map((word) =>
        word.id === selectedWord.id
          ? {
              ...word,
              contributionCount: word.contributionCount + 1,
              latestTranslation: translation,
              latestSynonyms: synonyms,
            }
          : word
      ),
    }));
  }

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1d241f]">
      <section className="border-b border-[#ddd6c5] bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0bd] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667065] shadow-sm">
                  <LibraryBig className="h-4 w-4 text-[#2f6b58]" />
                  {t.appName}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-normal text-[#18221d] sm:text-5xl">{t.translateFrenchList}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href="/compare"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#c9c0ad] bg-white px-4 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
                  >
                    {t.comparisonPage}
                  </a>
                  <span className="inline-flex h-10 items-center gap-2 rounded-md bg-[#e8efe8] px-4 text-sm font-semibold text-[#344f40]">
                    <Rows3 className="h-4 w-4" />
                    {data.total || 490} words
                  </span>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-[#30372f] md:min-w-80">
                {t.contributionLanguage}
                <span className="relative">
                  <Languages className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#657263]" />
                  <select
                    value={language}
                    onChange={(event) => {
                      setLanguage(event.target.value);
                      setOffset(0);
                      setTranslation('');
                      setSynonyms('');
                    }}
                    className="h-14 w-full rounded-lg border border-[#c4bba8] bg-white pl-12 pr-4 text-base font-semibold text-[#20231f] shadow-sm outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10"
                  >
                    {languages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
            <form onSubmit={search} className="flex flex-col gap-3 rounded-xl border border-[#ddd6c5] bg-white p-2 shadow-sm sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#657263]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-14 w-full rounded-lg border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base outline-none transition focus:border-[#2f6b58] focus:bg-white focus:ring-4 focus:ring-[#2f6b58]/10"
                />
              </label>
              <button className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-[#2f6b58] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#255645]">
                <Search className="h-5 w-5" />
                {t.search}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(300px,420px)_1fr] lg:px-8">
        <aside className="overflow-hidden rounded-xl border border-[#ddd6c5] bg-white shadow-sm">
          <div className="border-b border-[#e7e1d4] bg-[#fbfaf6] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">Word list</p>
                <p className="mt-1 text-sm font-semibold text-[#354137]">
                  {isLoading ? t.loading : `${offset + 1}-${pageEnd} ${t.of} ${data.total}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  aria-label={t.previousPage}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9c0ad] bg-white text-[#2d372f] shadow-sm transition hover:border-[#2f6b58] disabled:opacity-40"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= data.total}
                  aria-label={t.nextPage}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9c0ad] bg-white text-[#2d372f] shadow-sm transition hover:border-[#2f6b58] disabled:opacity-40"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#e2dccc] bg-white px-3 py-2">
                <p className="text-xs font-medium text-[#73786f]">This page</p>
                <p className="mt-1 text-xl font-semibold text-[#1d241f]">{data.rows.length}</p>
              </div>
              <div className="rounded-lg border border-[#e2dccc] bg-white px-3 py-2">
                <p className="text-xs font-medium text-[#73786f]">Completed</p>
                <p className="mt-1 text-xl font-semibold text-[#2f6b58]">{completedOnPage}</p>
              </div>
            </div>
          </div>
          <div className="max-h-[calc(100vh-310px)] overflow-auto p-3">
            {data.rows.map((word) => (
              <button
                key={word.id}
                type="button"
                onClick={() => selectWord(word)}
                className={`mb-3 block w-full rounded-lg border p-4 text-left transition ${
                  selectedWord?.id === word.id
                    ? 'border-[#2f6b58] bg-[#eef6f0] shadow-sm ring-4 ring-[#2f6b58]/10'
                    : 'border-[#e4dfd2] bg-white hover:border-[#b7aa94] hover:bg-[#fbfaf6]'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-xl font-semibold text-[#1d241f]">{word.french}</span>
                    <span className="mt-1 block text-sm font-medium text-[#646a60]">{word.nufi.slice(0, 3).join(' / ') || t.noNufiEntry}</span>
                  </span>
                  {word.contributionCount ? (
                    <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-xs font-semibold text-[#2f6b58]">{word.contributionCount}</span>
                  ) : null}
                </span>
                {word.latestTranslation ? (
                  <span className="mt-3 block rounded-md bg-white/80 px-3 py-2 text-sm font-medium text-[#344437]">
                    {selectedLanguageLabel}: {word.latestTranslation}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={submit} className="overflow-hidden rounded-xl border border-[#ddd6c5] bg-white shadow-sm">
          {selectedWord ? (
            <>
              <div className="border-b border-[#e7e1d4] bg-[#fbfaf6] p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">{t.frenchWord}</p>
                    <p className="mt-2 text-5xl font-semibold text-[#18221d]">{selectedWord.french}</p>
                    {selectedWord.english ? <p className="mt-3 text-base font-medium text-[#62685d]">{t.english}: {selectedWord.english}</p> : null}
                  </div>
                  <div className="rounded-xl border border-[#e2dccc] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">{t.nufiReference}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedWord.nufi.length ? (
                        selectedWord.nufi.map((value, index) => (
                          <span key={`${value}-${index}`} className="rounded-lg bg-[#edf1e9] px-4 py-2 text-lg font-semibold text-[#1d241f]">
                            {value}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#62685d]">{t.noNufiReference}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:p-6">
                <label className="grid gap-2">
                  <span className="text-base font-semibold text-[#30352f]">{t.translationIn} {selectedLanguageLabel}</span>
                  <input
                    value={translation}
                    onChange={(event) => setTranslation(event.target.value)}
                    className="min-h-14 rounded-lg border border-[#c4bba8] px-4 text-xl outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10"
                    placeholder={t.writeWordHere(selectedLanguageLabel)}
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-base font-semibold text-[#30352f]">{t.synonymsLabel}</span>
                  <textarea
                    value={synonyms}
                    onChange={(event) => setSynonyms(event.target.value)}
                    className="min-h-28 rounded-lg border border-[#c4bba8] px-4 py-3 text-lg outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10"
                    placeholder={t.synonymsPlaceholder}
                  />
                </label>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-base font-semibold text-[#30352f]">{t.yourName}</span>
                    <input
                      value={contributorName}
                      onChange={(event) => setContributorName(event.target.value)}
                      className="h-12 rounded-lg border border-[#c4bba8] px-4 text-base outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10"
                      placeholder={t.optional}
                    />
                    <span className="text-sm font-medium text-[#62685d]">{t.contributorNameSessionHint}</span>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-base font-semibold text-[#30352f]">{t.notes}</span>
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="h-12 rounded-lg border border-[#c4bba8] px-4 text-base outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10"
                      placeholder={t.notesPlaceholder}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e7e1d4] bg-[#fbfaf6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="min-h-6 text-sm font-medium text-[#4d6252]">{message}</p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2f6b58] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#255645] disabled:opacity-60"
                >
                  {isSaving ? <Sparkles className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                  {isSaving ? t.saving : t.saveTranslation}
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[#62685d]">{t.noWordsFound}</div>
          )}
        </form>
      </section>
    </main>
  );
}
