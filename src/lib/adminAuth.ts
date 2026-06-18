import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'collab_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = {
  email: string;
  issuedAt: number;
};

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '';
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(email: string) {
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

export function adminAuthConfigured() {
  return Boolean(getAdminPassword() && getSessionSecret() && getAdminEmails().length);
}

export function isAllowedAdminEmail(email: string) {
  return getAdminEmails().includes(normalizeEmail(email));
}

export function verifyAdminCredentials(email: string, password: string) {
  const configured = getAdminPassword();
  return Boolean(configured && isAllowedAdminEmail(email)) && safeEqual(password, configured);
}

export async function createAdminSession(email: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ email: normalizeEmail(email), issuedAt } satisfies AdminSession),
  ).toString('base64url');
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

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!adminAuthConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const payload = parts[0];
  const expected = sign(payload);
  if (!safeEqual(parts[1], expected)) return null;

  let session: AdminSession;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
  } catch {
    return null;
  }

  const issuedAt = Number(session.issuedAt);
  if (!Number.isFinite(issuedAt) || Math.floor(Date.now() / 1000) - issuedAt > SESSION_TTL_SECONDS) {
    return null;
  }

  const email = normalizeEmail(session.email || '');
  if (!email || !isAllowedAdminEmail(email)) return null;

  return { email, issuedAt };
}

export async function isAdminSession() {
  return Boolean(await getAdminSession());
}

export async function requireAdmin() {
  if (await isAdminSession()) return null;
  return Response.json({ error: 'Admin authentication required.' }, { status: 401 });
}
