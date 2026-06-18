import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'collab_contributor';
export const CONTRIBUTOR_OAUTH_STATE_COOKIE = 'collab_contributor_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 60;

type ContributorSession = {
  email: string;
  issuedAt: number;
};

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || '';
}

export function normalizeContributorEmail(email: string) {
  return email.trim().toLowerCase();
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function contributorAuthConfigured() {
  return Boolean(getSessionSecret());
}

export function contributorGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && getSessionSecret());
}

export async function createContributorSession(email: string) {
  const normalizedEmail = normalizeContributorEmail(email);
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ email: normalizedEmail, issuedAt } satisfies ContributorSession)).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function clearContributorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getContributorSession(): Promise<ContributorSession | null> {
  if (!contributorAuthConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const payload = parts[0];
  const expected = sign(payload);
  if (!safeEqual(parts[1], expected)) return null;

  let session: ContributorSession;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ContributorSession;
  } catch {
    return null;
  }

  const issuedAt = Number(session.issuedAt);
  if (!Number.isFinite(issuedAt) || Math.floor(Date.now() / 1000) - issuedAt > SESSION_TTL_SECONDS) return null;

  const email = normalizeContributorEmail(session.email || '');
  if (!email) return null;

  return { email, issuedAt };
}
