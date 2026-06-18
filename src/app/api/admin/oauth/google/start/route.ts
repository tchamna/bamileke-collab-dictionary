import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_OAUTH_STATE_COOKIE, adminGoogleAuthConfigured } from '@/lib/adminAuth';
import { publicUrl } from '@/lib/publicUrl';

function callbackUrl(request: NextRequest) {
  return publicUrl(request, '/api/admin/oauth/google/callback');
}

export async function GET(request: NextRequest) {
  if (!adminGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL('/admin?error=google_not_configured', request.url));
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl(request));
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authorizationUrl);
}
