'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Languages, Save, Search } from 'lucide-react';

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

export function ContributionWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
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
        if (error.name !== 'AbortError') setMessage('Unable to load the word list.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [language, activeQuery, offset]);

  const selectedWord = useMemo(
    () => data.rows.find((word) => word.id === selectedWordId) ?? data.rows[0] ?? null,
    [data.rows, selectedWordId]
  );
  const selectedLanguageLabel = languages.find((item) => item.id === language)?.label ?? language;
  const pageEnd = Math.min(offset + data.rows.length, data.total);

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
      setMessage('Please add a translation before saving.');
      return;
    }

    setMessage('Saved. Thank you for contributing.');
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
    <main className="min-h-screen bg-[#f7f7f2] text-[#20231f]">
      <section className="border-b border-[#d9d8cc] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[#6c6f67]">Dictionnaire collaboratif</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#20231f]">Traduire la liste française</h1>
              <a href="/compare" className="mt-2 inline-block text-sm font-semibold text-[#295f4e] underline">
                View comparison page
              </a>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-[#3f443c]">
              Langue de contribution
              <span className="relative">
                <Languages className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
                <select
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.target.value);
                    setOffset(0);
                    setTranslation('');
                    setSynonyms('');
                  }}
                  className="h-12 w-full rounded-md border border-[#b8bcad] bg-white pl-10 pr-4 text-base md:w-72"
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
          <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search French or Nufi word"
                className="h-12 w-full rounded-md border border-[#b8bcad] bg-white pl-10 pr-4 text-base"
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-5 text-base font-semibold text-white hover:bg-[#1f4b3d]">
              <Search className="h-5 w-5" />
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(280px,430px)_1fr] lg:px-8">
        <aside className="min-h-[400px] rounded-lg border border-[#d6d7cc] bg-white">
          <div className="flex items-center justify-between border-b border-[#e3e3da] px-4 py-3">
            <div className="text-sm text-[#5e6459]">
              {isLoading ? 'Loading...' : `${offset + 1}-${pageEnd} of ${data.total}`}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                aria-label="Previous page"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c9cabc] bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= data.total}
                aria-label="Next page"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c9cabc] bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-250px)] overflow-auto p-2">
            {data.rows.map((word) => (
              <button
                key={word.id}
                type="button"
                onClick={() => selectWord(word)}
                className={`mb-2 block w-full rounded-md border p-3 text-left transition ${
                  selectedWord?.id === word.id
                    ? 'border-[#295f4e] bg-[#eef7f0]'
                    : 'border-[#e1e2d8] bg-white hover:border-[#9ba58f]'
                }`}
              >
                <span className="block text-lg font-semibold text-[#20231f]">{word.french}</span>
                <span className="mt-1 block text-sm text-[#60665b]">{word.nufi.slice(0, 3).join(' / ') || 'No Nufi entry'}</span>
                {word.latestTranslation ? (
                  <span className="mt-2 block rounded bg-[#f1f4ec] px-2 py-1 text-sm text-[#344437]">
                    {selectedLanguageLabel}: {word.latestTranslation}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={submit} className="rounded-lg border border-[#d6d7cc] bg-white p-4 sm:p-6">
          {selectedWord ? (
            <>
              <div className="grid gap-4 border-b border-[#e3e3da] pb-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-[#687064]">French word</p>
                  <p className="mt-2 text-4xl font-semibold text-[#20231f]">{selectedWord.french}</p>
                  {selectedWord.english ? <p className="mt-2 text-base text-[#62685d]">English: {selectedWord.english}</p> : null}
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-[#687064]">Nufi reference</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedWord.nufi.length ? (
                      selectedWord.nufi.map((value, index) => (
                        <span key={`${value}-${index}`} className="rounded-md bg-[#eef1e8] px-3 py-2 text-lg font-medium text-[#20231f]">
                          {value}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#62685d]">No Nufi reference for this row.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-base font-semibold text-[#30352f]">Translation in {selectedLanguageLabel}</span>
                  <input
                    value={translation}
                    onChange={(event) => setTranslation(event.target.value)}
                    className="min-h-14 rounded-md border border-[#b8bcad] px-4 text-xl"
                    placeholder={`Write the ${selectedLanguageLabel} word here`}
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-base font-semibold text-[#30352f]">Synonyms or alternate spellings</span>
                  <textarea
                    value={synonyms}
                    onChange={(event) => setSynonyms(event.target.value)}
                    className="min-h-24 rounded-md border border-[#b8bcad] px-4 py-3 text-lg"
                    placeholder="Separate alternatives with commas"
                  />
                </label>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-base font-semibold text-[#30352f]">Your name</span>
                    <input
                      value={contributorName}
                      onChange={(event) => setContributorName(event.target.value)}
                      className="h-12 rounded-md border border-[#b8bcad] px-4 text-base"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-base font-semibold text-[#30352f]">Notes</span>
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="h-12 rounded-md border border-[#b8bcad] px-4 text-base"
                      placeholder="Dialect, tone, usage..."
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-[#e3e3da] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-h-6 text-sm font-medium text-[#4d6252]">{message}</p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-6 text-base font-semibold text-white hover:bg-[#1f4b3d] disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  {isSaving ? 'Saving...' : 'Save translation'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[#62685d]">No words found.</div>
          )}
        </form>
      </section>
    </main>
  );
}
