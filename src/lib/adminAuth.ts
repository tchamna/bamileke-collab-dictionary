import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'collab_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '';
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
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
  return Boolean(getAdminPassword() && getSessionSecret());
}

export function verifyAdminPassword(password: string) {
  const configured = getAdminPassword();
  return Boolean(configured) && safeEqual(password, configured);
}

export async function createAdminSession() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `admin.${issuedAt}`;
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

export async function isAdminSession() {
  if (!adminAuthConfigured()) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  if (!safeEqual(parts[2], expected)) return false;

  const issuedAt = Number(parts[1]);
  return Number.isFinite(issuedAt) && Math.floor(Date.now() / 1000) - issuedAt <= SESSION_TTL_SECONDS;
}

export async function requireAdmin() {
  if (await isAdminSession()) return null;
  return Response.json({ error: 'Admin authentication required.' }, { status: 401 });
}

