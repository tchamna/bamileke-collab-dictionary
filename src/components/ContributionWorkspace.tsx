'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Download, Languages, LibraryBig, LogOut, Mail, Rows3, Save, Search, Shuffle, SkipForward, Sparkles } from 'lucide-react';
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

type ContributorStats = {
  contributionCount: number;
  points: number;
};

type ContributorSessionResponse = ContributorStats & {
  authenticated: boolean;
  email: string;
  googleConfigured: boolean;
};

type ContributionResponse = {
  ok: boolean;
  id: number;
  contributorStats?: ContributorStats;
};

const PAGE_SIZE = 50;
const CONTRIBUTOR_NAME_STORAGE_KEY = 'bamilekeContributorName';
const CONTRIBUTOR_EMAIL_STORAGE_KEY = 'bamilekeContributorEmail';
type MobileQueueMode = 'random' | 'sequential';

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
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorStats, setContributorStats] = useState<ContributorStats>({ contributionCount: 0, points: 0 });
  const [isContributorSignedIn, setIsContributorSignedIn] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showExistingTranslationDialog, setShowExistingTranslationDialog] = useState(false);
  const [mobileQueueMode, setMobileQueueMode] = useState<MobileQueueMode>('random');
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
          const nextWord = payload.rows[0] ?? null;
          setTranslation(nextWord?.latestTranslation ?? '');
          setSynonyms(nextWord?.latestSynonyms ?? '');
          setNotes('');
          return nextWord?.id ?? null;
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
    const storedEmail = window.sessionStorage.getItem(CONTRIBUTOR_EMAIL_STORAGE_KEY);
    if (storedEmail) setContributorEmail(storedEmail);

    fetch('/api/contributor/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: ContributorSessionResponse) => {
        setGoogleConfigured(payload.googleConfigured);
        setIsContributorSignedIn(payload.authenticated);
        if (payload.email) {
          setContributorEmail(payload.email);
          window.sessionStorage.setItem(CONTRIBUTOR_EMAIL_STORAGE_KEY, payload.email);
        }
        setContributorStats({ contributionCount: payload.contributionCount, points: payload.points });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const trimmedName = contributorName.trim();
    if (trimmedName) {
      window.sessionStorage.setItem(CONTRIBUTOR_NAME_STORAGE_KEY, trimmedName);
    } else {
      window.sessionStorage.removeItem(CONTRIBUTOR_NAME_STORAGE_KEY);
    }
  }, [contributorName]);

  useEffect(() => {
    const trimmedEmail = contributorEmail.trim().toLowerCase();
    if (trimmedEmail) {
      window.sessionStorage.setItem(CONTRIBUTOR_EMAIL_STORAGE_KEY, trimmedEmail);
    } else {
      window.sessionStorage.removeItem(CONTRIBUTOR_EMAIL_STORAGE_KEY);
      setContributorStats({ contributionCount: 0, points: 0 });
    }

    const timeout = window.setTimeout(() => {
      if (!trimmedEmail || !trimmedEmail.includes('@')) return;
      fetch(`/api/contributor/stats?email=${encodeURIComponent(trimmedEmail)}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload: ContributorStats) => setContributorStats(payload))
        .catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [contributorEmail]);

  const selectedWord = useMemo(
    () => data.rows.find((word) => word.id === selectedWordId) ?? data.rows[0] ?? null,
    [data.rows, selectedWordId]
  );
  const selectedLanguageLabel = languages.find((item) => item.id === language)?.label ?? language;
  const selectedWordIndex = selectedWord ? data.rows.findIndex((word) => word.id === selectedWord.id) : -1;
  const pageEnd = Math.min(offset + data.rows.length, data.total);
  const completedOnPage = data.rows.filter((word) => word.latestTranslation).length;
  const normalizedContributorEmail = contributorEmail.trim().toLowerCase();
  const contributorExportHref = normalizedContributorEmail.includes('@')
    ? `/api/contributor/contributions/export?email=${encodeURIComponent(normalizedContributorEmail)}`
    : '';

  function selectWord(word: WordItem) {
    setSelectedWordId(word.id);
    setTranslation(word.latestTranslation ?? '');
    setSynonyms(word.latestSynonyms ?? '');
    setNotes('');
    setMessage('');
  }

  function selectWordAt(index: number) {
    const nextWord = data.rows[index];
    if (nextWord) selectWord(nextWord);
  }

  function nextSequentialWord() {
    if (selectedWordIndex >= 0 && selectedWordIndex < data.rows.length - 1) {
      selectWordAt(selectedWordIndex + 1);
      return;
    }

    if (offset + PAGE_SIZE < data.total) {
      setOffset(offset + PAGE_SIZE);
    }
  }

  function nextRandomWord() {
    const untranslated = data.rows.filter((word) => word.id !== selectedWordId && word.contributionCount === 0);
    const candidates = untranslated.length ? untranslated : data.rows.filter((word) => word.id !== selectedWordId);

    if (candidates.length) {
      selectWord(candidates[Math.floor(Math.random() * candidates.length)]);
      return;
    }

    if (offset + PAGE_SIZE < data.total) {
      setOffset(offset + PAGE_SIZE);
    }
  }

  function showNextWord() {
    if (mobileQueueMode === 'random') {
      nextRandomWord();
    } else {
      nextSequentialWord();
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setActiveQuery(query.trim());
  }

  async function saveContribution() {
    if (!selectedWord) return false;
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
        contributorEmail,
        notes,
      }),
    });

    setIsSaving(false);
    if (!response.ok) {
      setMessage(t.addTranslationFirst);
      return false;
    }

    const payload = (await response.json()) as ContributionResponse;
    if (payload.contributorStats) setContributorStats(payload.contributorStats);
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
    showNextWord();
    return true;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedWord) return;

    const currentTranslation = selectedWord.latestTranslation?.trim() ?? '';
    const currentSynonyms = selectedWord.latestSynonyms?.trim() ?? '';
    const nextTranslation = translation.trim();
    const nextSynonyms = synonyms.trim();

    if (currentTranslation && (currentTranslation !== nextTranslation || currentSynonyms !== nextSynonyms)) {
      setShowExistingTranslationDialog(true);
      return;
    }

    void saveContribution();
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
                <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[#18221d] sm:mt-4 sm:text-5xl">{t.translateFrenchList}</h1>
                <div className="mt-4 hidden flex-wrap items-center gap-3 sm:flex">
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
                      setSelectedWordId(null);
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
            <form onSubmit={search} className="hidden flex-col gap-3 rounded-xl border border-[#ddd6c5] bg-white p-2 shadow-sm lg:flex lg:flex-row">
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
        <aside id="word-list" className="order-2 overflow-hidden rounded-xl border border-[#ddd6c5] bg-white shadow-sm lg:order-1">
          <div className="border-b border-[#e7e1d4] bg-[#fbfaf6] px-4 py-4">
            <form onSubmit={search} className="mb-4 flex flex-col gap-2 rounded-lg border border-[#ddd6c5] bg-white p-2 shadow-sm lg:hidden">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#657263]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-11 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-10 pr-3 text-base outline-none transition focus:border-[#2f6b58] focus:bg-white focus:ring-4 focus:ring-[#2f6b58]/10"
                />
              </label>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2f6b58] px-4 text-base font-semibold text-white shadow-sm">
                <Search className="h-5 w-5" />
                {t.search}
              </button>
            </form>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">{t.wordList}</p>
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
          <div className="grid gap-2 p-3">
            {data.rows.map((word) => (
              <button
                key={word.id}
                type="button"
                onClick={() => selectWord(word)}
                className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${
                  selectedWord?.id === word.id
                    ? 'border-[#2f6b58] bg-[#eef6f0] shadow-sm ring-4 ring-[#2f6b58]/10'
                    : 'border-[#e4dfd2] bg-white hover:border-[#b7aa94] hover:bg-[#fbfaf6]'
                }`}
              >
                <span className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold leading-tight text-[#1d241f]" title={word.french}>
                      {word.french}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium leading-tight text-[#646a60]" title={word.nufi.join(' / ')}>
                      {word.nufi.slice(0, 3).join(' / ') || t.noNufiEntry}
                    </span>
                  </span>
                  {word.contributionCount ? (
                    <span className="rounded-full bg-[#e8efe8] px-2.5 py-1 text-xs font-semibold text-[#2f6b58]">{word.contributionCount}</span>
                  ) : null}
                </span>
                {word.latestTranslation ? (
                  <span className="mt-2 block truncate rounded-md bg-white/80 px-2 py-1.5 text-sm font-medium text-[#344437]" title={`${selectedLanguageLabel}: ${word.latestTranslation}`}>
                    {selectedLanguageLabel}: {word.latestTranslation}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <form id="translation-form" onSubmit={submit} className="order-1 overflow-hidden rounded-xl border border-[#ddd6c5] bg-white shadow-sm lg:order-2">
          {selectedWord ? (
            <>
              <div className="border-b border-[#e7e1d4] bg-[#fbfaf6] p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#e2dccc] bg-white px-3 py-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => selectWordAt(selectedWordIndex - 1)}
                    disabled={selectedWordIndex <= 0}
                    aria-label={t.previousPage}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c9c0ad] text-[#2d372f] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74776d]">{t.wordToTranslate}</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#2f6b58]">
                      {selectedWordIndex + 1} {t.of} {data.rows.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectWordAt(selectedWordIndex + 1)}
                    disabled={selectedWordIndex < 0 || selectedWordIndex >= data.rows.length - 1}
                    aria-label={t.nextPage}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c9c0ad] text-[#2d372f] disabled:opacity-40"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-4 grid gap-3 rounded-lg border border-[#e2dccc] bg-white p-3 lg:hidden">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#f4f1e8] p-1">
                    <button
                      type="button"
                      onClick={() => setMobileQueueMode('random')}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                        mobileQueueMode === 'random' ? 'bg-[#2f6b58] text-white shadow-sm' : 'text-[#344437]'
                      }`}
                    >
                      <Shuffle className="h-4 w-4" />
                      {t.random}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileQueueMode('sequential')}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                        mobileQueueMode === 'sequential' ? 'bg-[#2f6b58] text-white shadow-sm' : 'text-[#344437]'
                      }`}
                    >
                      <Rows3 className="h-4 w-4" />
                      {t.sequential}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={showNextWord}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c9c0ad] bg-white px-4 text-base font-semibold text-[#295f4e] shadow-sm"
                  >
                    <SkipForward className="h-5 w-5" />
                    {t.skipWord}
                  </button>
                </div>
                <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">{t.frenchWord}</p>
                    <p className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#18221d] sm:text-4xl">
                      {selectedWord.french}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {selectedWord.english ? <p className="text-base font-medium text-[#62685d]">{t.english}: {selectedWord.english}</p> : null}
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#d6cfbf] bg-white px-3 py-1.5 text-sm font-semibold text-[#2f6b58] shadow-sm">
                        <Award className="h-4 w-4" />
                        {contributorStats.points} {t.points}
                      </span>
                    </div>
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
                <div className="rounded-xl border border-[#e2dccc] bg-[#fbfaf6] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <label className="grid flex-1 gap-2">
                      <span className="flex items-center gap-2 text-base font-semibold text-[#30352f]">
                        <Mail className="h-4 w-4 text-[#2f6b58]" />
                        {t.contributorEmail}
                      </span>
                      <input
                        type="email"
                        value={contributorEmail}
                        onChange={(event) => setContributorEmail(event.target.value)}
                        disabled={isContributorSignedIn}
                        className="h-12 rounded-lg border border-[#c4bba8] px-4 text-base outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10 disabled:bg-[#ede8dc] disabled:text-[#62685d]"
                        placeholder="name@example.com"
                      />
                      <span className="text-sm font-medium text-[#62685d]">{t.contributorEmailHint}</span>
                    </label>
                    <div className="grid gap-3 sm:min-w-72">
                      <div className="rounded-lg border border-[#d6cfbf] bg-white p-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-[#2f6b58]">
                          <Award className="h-4 w-4" />
                          {t.contributorProfile}
                        </span>
                        <p className="mt-2 text-2xl font-semibold text-[#18221d]">{contributorStats.points} {t.points}</p>
                        <p className="text-sm font-medium text-[#62685d]">
                          {t.contributionPoints(contributorStats.contributionCount, contributorStats.points)}
                        </p>
                        {contributorExportHref ? (
                          <a
                            href={contributorExportHref}
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#c9c0ad] bg-white px-4 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
                          >
                            <Download className="h-4 w-4" />
                            {t.downloadMyContributions}
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d8d0bd] bg-[#f3efe6] px-4 text-sm font-semibold text-[#8a8d82]"
                          >
                            <Download className="h-4 w-4" />
                            {t.downloadMyContributions}
                          </button>
                        )}
                      </div>
                      {isContributorSignedIn ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch('/api/contributor/session', { method: 'DELETE' });
                            setIsContributorSignedIn(false);
                          }}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c9c0ad] bg-white px-4 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
                        >
                          <LogOut className="h-4 w-4" />
                          {t.signOut}
                        </button>
                      ) : googleConfigured ? (
                        <a
                          href="/api/contributor/oauth/google/start"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c9c0ad] bg-white px-4 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
                        >
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-white font-semibold text-[#4285f4]">G</span>
                          {t.signInWithGoogle}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
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

              <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-[#e7e1d4] bg-[#fbfaf6]/95 px-5 py-4 shadow-[0_-8px_24px_rgba(38,34,26,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:static lg:shadow-none lg:backdrop-blur-0">
                <div className="grid gap-1">
                  <p className="min-h-6 text-sm font-medium text-[#4d6252]">{message}</p>
                  <p className="text-sm font-semibold text-[#2f6b58]">
                    {t.contributionPoints(contributorStats.contributionCount, contributorStats.points)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href="#word-list"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-[#c9c0ad] bg-white px-5 text-base font-semibold text-[#295f4e] shadow-sm lg:hidden"
                  >
                    {t.findWord}
                  </a>
                  <button
                    type="button"
                    onClick={showNextWord}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c9c0ad] bg-white px-5 text-base font-semibold text-[#295f4e] shadow-sm lg:hidden"
                  >
                    <SkipForward className="h-5 w-5" />
                    {t.skipWord}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2f6b58] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#255645] disabled:opacity-60"
                  >
                    {isSaving ? <Sparkles className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {isSaving ? t.saving : t.saveTranslation}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[#62685d]">{t.noWordsFound}</div>
          )}
        </form>
      </section>
      {showExistingTranslationDialog && selectedWord ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111713]/45 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="existing-translation-title"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-[#d8d0bd] bg-[#fbfaf6] shadow-2xl"
          >
            <div className="border-b border-[#e2dccc] bg-white px-5 py-4">
              <p id="existing-translation-title" className="text-xl font-semibold text-[#18221d]">
                {t.existingTranslationTitle}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#62685d]">
                {t.existingTranslationMessage(selectedLanguageLabel)}
              </p>
            </div>
            <div className="grid gap-3 px-5 py-4">
              <div className="rounded-lg border border-[#e2dccc] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">{t.currentTranslation}</p>
                <p className="mt-2 text-lg font-semibold text-[#18221d]">{selectedWord.latestTranslation}</p>
                {selectedWord.latestSynonyms ? <p className="mt-1 text-sm font-medium text-[#62685d]">{selectedWord.latestSynonyms}</p> : null}
              </div>
              <div className="rounded-lg border border-[#2f6b58]/35 bg-[#eef6f0] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f6b58]">{t.newTranslation}</p>
                <p className="mt-2 text-lg font-semibold text-[#18221d]">{translation}</p>
                {synonyms ? <p className="mt-1 text-sm font-medium text-[#62685d]">{synonyms}</p> : null}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-[#e2dccc] bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExistingTranslationDialog(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[#c9c0ad] bg-white px-5 text-sm font-semibold text-[#295f4e] shadow-sm hover:border-[#295f4e]"
              >
                {t.keepCurrentTranslation}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExistingTranslationDialog(false);
                  void saveContribution();
                }}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2f6b58] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#255645]"
              >
                {t.confirmTranslationChange}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
