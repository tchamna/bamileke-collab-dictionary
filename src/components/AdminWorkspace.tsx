'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LogOut, Save, Search, Shield, Trash2 } from 'lucide-react';

type AdminContribution = {
  id: number;
  wordId: number;
  french: string;
  english: string;
  nufi: string[];
  language: string;
  translation: string;
  synonyms: string;
  contributorName: string;
  notes: string;
  status: 'approved' | 'pending' | 'rejected';
};

type AdminResponse = {
  rows: AdminContribution[];
  total: number;
  offset: number;
  limit: number;
};

const PAGE_SIZE = 50;

export function AdminWorkspace() {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminResponse>({ rows: [], total: 0, offset: 0, limit: PAGE_SIZE });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((session: { configured: boolean; authenticated: boolean; email?: string }) => {
        setConfigured(session.configured);
        setAuthenticated(session.authenticated);
        setAdminEmail(session.email || '');
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadContributions();
  }, [authenticated, activeQuery, offset]);

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
    setData({ rows: [], total: 0, offset: 0, limit: PAGE_SIZE });
  }

  async function loadContributions() {
    setIsLoading(true);
    const response = await fetch(`/api/admin/contributions?q=${encodeURIComponent(activeQuery)}&offset=${offset}&limit=${PAGE_SIZE}`, {
      cache: 'no-store',
    });
    setIsLoading(false);
    if (!response.ok) {
      setMessage('Unable to load admin entries.');
      return;
    }
    setData(await response.json());
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setActiveQuery(query.trim());
  }

  function updateLocal(id: number, patch: Partial<AdminContribution>) {
    setData((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  async function save(row: AdminContribution) {
    setMessage('');
    const response = await fetch(`/api/admin/contributions/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    setMessage(response.ok ? 'Entry saved.' : 'Unable to save entry.');
  }

  async function remove(row: AdminContribution) {
    const confirmed = window.confirm(`Delete contribution for "${row.french}" in ${row.language}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/contributions/${row.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Unable to delete entry.');
      return;
    }
    setData((current) => ({
      ...current,
      total: Math.max(0, current.total - 1),
      rows: current.rows.filter((item) => item.id !== row.id),
    }));
    setMessage('Entry deleted.');
  }

  if (!configured) {
    return (
      <main className="min-h-screen bg-[#f4f3ed] px-4 py-10 text-[#20231f]">
        <section className="mx-auto max-w-xl rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Admin not configured</h1>
          <p className="mt-3 text-[#62685d]">Set ADMIN_EMAILS, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET in the app environment.</p>
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
          <form onSubmit={search} className="flex flex-col gap-3 rounded-lg border border-[#d8d6c8] bg-white p-2 shadow-sm sm:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#69705f]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search French, Nufi, language, translation, contributor..."
                className="h-12 w-full rounded-md border border-transparent bg-[#fbfaf6] pl-12 pr-4 text-base outline-none focus:border-[#295f4e]"
              />
            </label>
            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-6 text-base font-semibold text-white">
              <Search className="h-5 w-5" />
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-[#5e6459]">
            {isLoading ? 'Loading...' : `${offset + 1}-${pageEnd} of ${data.total}`}
          </p>
          {message ? <p className="text-sm font-semibold text-[#295f4e]">{message}</p> : null}
        </div>

        <div className="grid gap-4">
          {data.rows.map((row) => (
            <article key={row.id} className="rounded-lg border border-[#d8d6c8] bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(240px,340px)_1fr]">
                <div className="rounded-md bg-[#fbfaf6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#687064]">French</p>
                  <h2 className="mt-1 text-2xl font-semibold">{row.french}</h2>
                  {row.english ? <p className="mt-2 text-sm text-[#62685d]">English: {row.english}</p> : null}
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#687064]">Nufi</p>
                  <p className="mt-1 text-sm font-semibold">{row.nufi.join(' / ') || '-'}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Language
                    <input
                      value={row.language}
                      onChange={(event) => updateLocal(row.id, { language: event.target.value })}
                      className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Status
                    <select
                      value={row.status}
                      onChange={(event) => updateLocal(row.id, { status: event.target.value as AdminContribution['status'] })}
                      className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                    >
                      <option value="approved">approved</option>
                      <option value="pending">pending</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold md:col-span-2">
                    Translation
                    <input
                      value={row.translation}
                      onChange={(event) => updateLocal(row.id, { translation: event.target.value })}
                      className="h-11 rounded-md border border-[#b8bcad] px-3 text-lg font-semibold"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Synonyms
                    <textarea
                      value={row.synonyms}
                      onChange={(event) => updateLocal(row.id, { synonyms: event.target.value })}
                      className="min-h-20 rounded-md border border-[#b8bcad] px-3 py-2 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Notes
                    <textarea
                      value={row.notes}
                      onChange={(event) => updateLocal(row.id, { notes: event.target.value })}
                      className="min-h-20 rounded-md border border-[#b8bcad] px-3 py-2 font-normal"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Contributor
                    <input
                      value={row.contributorName}
                      onChange={(event) => updateLocal(row.id, { contributorName: event.target.value })}
                      className="h-11 rounded-md border border-[#b8bcad] px-3 font-normal"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => save(row)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#295f4e] px-4 font-semibold text-white"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c97962] bg-white px-4 font-semibold text-[#9b3d2f]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
