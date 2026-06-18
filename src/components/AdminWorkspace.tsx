'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Languages, LogOut, Save, Search, Shield, Trash2 } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';

type AdminWord = {
  wordId: number;
  french: string;
  english: string;
  nufi: string[];
  contributionId: number | null;
  language: string;
  translation: string;
  synonyms: string;
  contributorName: string;
  notes: string;
  status: 'approved' | 'pending' | 'rejected';
};

type AdminResponse = {
  rows: AdminWord[];
  total: number;
  offset: number;
  limit: number;
};

const PAGE_SIZE = 24;

const adminActionText = {
  fr: {
    discardLabel: 'Rejeter',
    deleteLabel: 'Supprimer',
    discardExplanation: "garde l'entree pour verification, la marque comme rejetee, la masque des resultats publics approuves et retire les points du contributeur.",
    deleteExplanation: "supprime definitivement l'entree. A utiliser pour le spam, les donnees de test ou les erreurs qui ne doivent pas etre conservees.",
  },
  en: {
    discardLabel: 'Discard',
    deleteLabel: 'Delete',
    discardExplanation: 'keeps the entry for review, marks it rejected, hides it from public approved results, and removes contributor points.',
    deleteExplanation: 'permanently removes the entry. Use it for spam, test data, or mistakes that should not be kept.',
  },
};

export function AdminWorkspace() {
  const [adminText, setAdminText] = useState(adminActionText.fr);
  const [configured, setConfigured] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguage] = useState('ghomala');
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [data, setData] = useState<AdminResponse>({ rows: [], total: 0, offset: 0, limit: PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const primary = navigator.languages?.[0] || navigator.language || '';
    setAdminText(primary.toLocaleLowerCase().startsWith('en') ? adminActionText.en : adminActionText.fr);

    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((session: { configured: boolean; googleConfigured?: boolean; authenticated: boolean; email?: string }) => {
        setConfigured(session.configured);
        setGoogleConfigured(Boolean(session.googleConfigured));
        setAuthenticated(session.authenticated);
        setAdminEmail(session.email || '');
      })
      .catch(() => setConfigured(false));

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error === 'not_admin') setMessage('This Google account is not allowed to administer the dictionary.');
    if (error === 'google_not_configured') setMessage('Google sign-in is not configured.');
    if (error === 'invalid_oauth_state') setMessage('Google sign-in expired. Try again.');
    if (error === 'google_token_failed' || error === 'google_profile_failed') setMessage('Google sign-in failed. Try again.');
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadWords();
  }, [authenticated, activeQuery, offset, language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOffset(0);
      setActiveQuery(query.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      setMessage('Invalid admin email or password.');
      return;
    }
    const session = (await response.json()) as { email?: string };
    setAdminEmail(session.email || email.trim().toLowerCase());
    setPassword('');
    setAuthenticated(true);
  }

  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setAuthenticated(false);
    setAdminEmail('');
    setSelectedWordId(null);
    setData({ rows: [], total: 0, offset: 0, limit: PAGE_SIZE });
  }

  async function loadWords() {
    setIsLoading(true);
    const response = await fetch(`/api/admin/words?language=${encodeURIComponent(language)}&q=${encodeURIComponent(activeQuery)}&offset=${offset}&limit=${PAGE_SIZE}`, {
      cache: 'no-store',
    });
    setIsLoading(false);
    if (!response.ok) {
      setMessage('Unable to load words.');
      return;
    }
    const payload = (await response.json()) as AdminResponse;
    setData(payload);
    setSelectedWordId((current) => {
      if (current && payload.rows.some((row) => row.wordId === current)) return current;
      return payload.rows[0]?.wordId ?? null;
    });
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setActiveQuery(query.trim());
  }

  function updateLocal(wordId: number, patch: Partial<AdminWord>) {
    setData((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.wordId === wordId ? { ...row, ...patch } : row)),
    }));
  }

  async function save(row: AdminWord) {
    setMessage('');
    const response = await fetch('/api/admin/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordId: row.wordId,
        contributionId: row.contributionId,
        language,
        translation: row.translation,
        synonyms: row.synonyms,
        contributorName: row.contributorName,
        notes: row.notes,
        status: row.status,
      }),
    });
    if (!response.ok) {
      setMessage('Unable to save entry.');
      return false;
    }
    const payload = (await response.json()) as { contributionId: number };
    updateLocal(row.wordId, { contributionId: payload.contributionId, language });
    setMessage('Entry saved.');
    return true;
  }

  async function discard(row: AdminWord) {
    if (!row.contributionId) {
      setMessage('There is no translation to discard for this word.');
      return;
    }

    const confirmed = window.confirm(`Discard ${language} translation for "${row.french}"? This will remove its contributor points.`);
    if (!confirmed) return;

    const rejectedRow = { ...row, status: 'rejected' as const };
    updateLocal(row.wordId, { status: 'rejected' });
    const saved = await save(rejectedRow);
    if (saved) setMessage('Entry discarded. Contributor points were reduced.');
  }

  async function remove(row: AdminWord) {
    if (!row.contributionId) {
      setMessage('There is no translation to delete for this word.');
      return;
    }
    const confirmed = window.confirm(`Delete ${language} translation for "${row.french}"?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/contributions/${row.contributionId}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Unable to delete entry.');
      return;
    }
    setData((current) => ({
      ...current,
      rows: current.rows.map((item) =>
        item.wordId === row.wordId
          ? { ...item, contributionId: null, translation: '', synonyms: '', contributorName: '', notes: '', status: 'approved' }
          : item
      ),
    }));
    setMessage('Entry deleted.');
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (newPassword.length < 12) {
      setMessage('Password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    const response = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!response.ok) {
      setMessage('Unable to save password.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Your admin password was saved.');
  }

  if (!configured) {
    return (
      <main className="min-h-screen bg-[#f4f3ed] px-4 py-10 text-[#20231f]">
        <section className="mx-auto max-w-xl rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Admin not configured</h1>
          <p className="mt-3 text-[#62685d]">Set ADMIN_EMAILS and ADMIN_SESSION_SECRET in the app environment.</p>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#f4f3ed] px-4 py-10 text-[#20231f]">
        <form onSubmit={login} className="mx-auto max-w-md rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#295f4e]" />
            <h1 className="text-2xl font-semibold">Admin login</h1>
          </div>
          {googleConfigured ? (
            <a
              href="/api/admin/oauth/google/start"
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#b8bcad] bg-white px-4 text-base font-semibold text-[#20231f] hover:bg-[#fbfaf6]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  fill="#4285F4"
                  d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.1 3.2v2.7h3.4c2-1.8 3.4-4.5 3.4-7.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3 0 5.5-1 7.3-2.8l-3.4-2.7c-1 .6-2.2 1-3.8 1-2.9 0-5.4-2-6.2-4.7H2.3v2.8C4.1 20.4 7.8 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.8 13.8c-.2-.6-.4-1.2-.4-1.8s.1-1.2.4-1.8V7.4H2.3C1.5 8.8 1 10.4 1 12s.5 3.2 1.3 4.6l3.5-2.8z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.5c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.5 2.2 15 1 12 1 7.8 1 4.1 3.6 2.3 7.4l3.5 2.8C6.6 7.5 9.1 5.5 12 5.5z"
                />
              </svg>
              Sign in with Google
            </a>
          ) : null}
          {googleConfigured ? (
            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a7f73]">
              <span className="h-px flex-1 bg-[#d8d6c8]" />
              Password fallback
              <span className="h-px flex-1 bg-[#d8d6c8]" />
            </div>
          ) : null}
          <label className="mt-6 grid gap-2 text-sm font-semibold text-[#3f443c]">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-md border border-[#b8bcad] px-4 text-base"
              autoComplete="email"
              autoFocus
            />
          </label>
          <label className="mt-6 grid gap-2 text-sm font-semibold text-[#3f443c]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-md border border-[#b8bcad] px-4 text-base"
              autoComplete="current-password"
            />
          </label>
          {message ? <p className="mt-3 text-sm font-medium text-[#7a3d2f]">{message}</p> : null}
          <button className="mt-5 h-12 w-full rounded-md bg-[#295f4e] px-4 font-semibold text-white hover:bg-[#1f4b3d]">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  const pageEnd = Math.min(offset + data.rows.length, data.total);
  const selectedWord = data.rows.find((row) => row.wordId === selectedWordId) ?? data.rows[0] ?? null;
  const selectedLanguageLabel = LANGUAGES.find((item) => item.id === language)?.label ?? language;

  return (
    <main className="min-h-screen bg-[#f4f3ed] text-[#20231f]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6f67]">Admin</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal">Manage translation entries</h1>
              {adminEmail ? <p className="mt-2 text-sm font-medium text-[#62685d]">Signed in as {adminEmail}</p> : null}
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cfd2c3] bg-white px-4 text-sm font-semibold text-[#344437]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
          <form onSubmit={search} className="grid gap-3 rounded-lg border border-[#d8d6c8] bg-white p-2 shadow-sm lg:grid-cols-[280px_1fr_auto]">
            <label className="relative">
              <Languages className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  setOffset(0);
                  setSelectedWordId(null);
                }}
                className="h-12 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base font-semibold outline-none focus:border-[#295f4e]"
              >
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search French, Nufi, ${selectedLanguageLabel} translation, contributor...`}
                className="h-12 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base outline-none focus:border-[#295f4e]"
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-6 text-base font-semibold text-white">
              <Search className="h-5 w-5" />
              Search
            </button>
          </form>
          <form onSubmit={savePassword} className="grid gap-3 rounded-lg border border-[#d8d6c8] bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_auto]">
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold text-[#344437]">Your password</p>
              <p className="mt-1 text-sm text-[#62685d]">Create or change your personal password for email/password login.</p>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                autoComplete="new-password"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                autoComplete="new-password"
              />
            </label>
            <button className="inline-flex h-11 items-center justify-center self-end rounded-md bg-[#295f4e] px-4 font-semibold text-white">
              Save password
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(280px,390px)_1fr] lg:px-8">
        <aside className="overflow-hidden rounded-lg border border-[#d8d6c8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e3e3da] bg-[#fbfaf6] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#687064]">{selectedLanguageLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#4d554b]">
                {isLoading ? 'Loading...' : `${offset + 1}-${pageEnd} of ${data.total}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd2c3] bg-white disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= data.total}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd2c3] bg-white disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-auto p-2">
            {data.rows.map((row) => (
              <button
                key={row.wordId}
                type="button"
                onClick={() => {
                  setSelectedWordId(row.wordId);
                  setMessage('');
                }}
                className={`mb-2 block w-full rounded-md border p-3 text-left transition ${
                  selectedWord?.wordId === row.wordId
                    ? 'border-[#295f4e] bg-[#eef7f0]'
                    : 'border-[#e1e2d8] bg-white hover:border-[#9ba58f]'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-lg font-semibold text-[#20231f]">{row.french}</span>
                    <span className="mt-1 block text-sm text-[#60665b]">{row.nufi.slice(0, 3).join(' / ') || '-'}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.contributionId ? 'bg-[#e8efe8] text-[#295f4e]' : 'bg-[#f1eee6] text-[#7a7569]'
                    }`}
                  >
                    {row.contributionId ? 'Filled' : 'Empty'}
                  </span>
                </span>
                {row.translation ? <span className="mt-2 block text-sm font-semibold text-[#344437]">{row.translation}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        <article className="rounded-lg border border-[#d8d6c8] bg-white p-4 shadow-sm sm:p-5">
          {selectedWord ? (
            <div className="grid gap-5">
              <div className="grid gap-4 rounded-md bg-[#fbfaf6] p-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#687064]">French</p>
                  <h2 className="mt-1 text-4xl font-semibold">{selectedWord.french}</h2>
                  {selectedWord.english ? <p className="mt-2 text-sm text-[#62685d]">English: {selectedWord.english}</p> : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#687064]">Nufi</p>
                  <p className="mt-2 text-lg font-semibold">{selectedWord.nufi.join(' / ') || '-'}</p>
                  <p className="mt-3 text-sm font-semibold text-[#4d6252]">
                    {selectedWord.contributionId ? `Editing ${selectedLanguageLabel} translation` : `No ${selectedLanguageLabel} translation yet`}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold md:col-span-2">
                  Translation in {selectedLanguageLabel}
                  <input
                    value={selectedWord.translation}
                    onChange={(event) => updateLocal(selectedWord.wordId, { translation: event.target.value })}
                    className="h-12 rounded-md border border-[#b8bcad] px-3 text-lg font-semibold"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Status
                  <select
                    value={selectedWord.status}
                    onChange={(event) => updateLocal(selectedWord.wordId, { status: event.target.value as AdminWord['status'] })}
                    className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                  >
                    <option value="approved">approved</option>
                    <option value="pending">pending</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Contributor
                  <input
                    value={selectedWord.contributorName}
                    onChange={(event) => updateLocal(selectedWord.wordId, { contributorName: event.target.value })}
                    className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Synonyms
                  <textarea
                    value={selectedWord.synonyms}
                    onChange={(event) => updateLocal(selectedWord.wordId, { synonyms: event.target.value })}
                    className="min-h-24 rounded-md border border-[#b8bcad] px-3 py-2 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Notes
                  <textarea
                    value={selectedWord.notes}
                    onChange={(event) => updateLocal(selectedWord.wordId, { notes: event.target.value })}
                    className="min-h-24 rounded-md border border-[#b8bcad] px-3 py-2 font-normal"
                  />
                </label>
              </div>

              <div className="grid gap-4 border-t border-[#e3e3da] pt-4">
                <div className="rounded-md border border-[#ded8c8] bg-[#fbfaf6] p-3 text-sm font-medium leading-6 text-[#555f55]">
                  <p>
                    <span className="font-semibold text-[#7a3d2f]">{adminText.discardLabel}</span> {adminText.discardExplanation}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[#7a3d2f]">{adminText.deleteLabel}</span> {adminText.deleteExplanation}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-h-6 text-sm font-semibold text-[#295f4e]">{message}</p>
                  <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => save(selectedWord)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-4 font-semibold text-white"
                  >
                    <Save className="h-4 w-4" />
                    {selectedWord.contributionId ? 'Update translation' : 'Create translation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => discard(selectedWord)}
                    disabled={!selectedWord.contributionId || selectedWord.status === 'rejected'}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c97962] bg-white px-4 font-semibold text-[#9b3d2f] disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4" />
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(selectedWord)}
                    disabled={!selectedWord.contributionId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c97962] bg-white px-4 font-semibold text-[#9b3d2f] disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-[#62685d]">No words found.</div>
          )}
        </article>
      </section>
    </main>
  );
}
