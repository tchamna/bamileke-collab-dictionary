import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_OAUTH_STATE_COOKIE,
  adminGoogleAuthConfigured,
  createAdminSession,
  isAllowedAdminEmail,
} from '@/lib/adminAuth';
import { publicUrl } from '@/lib/publicUrl';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
};

function callbackUrl(request: NextRequest) {
  return publicUrl(request, '/api/admin/oauth/google/callback');
}

function redirectToAdmin(request: NextRequest, error?: string) {
  const url = new URL(publicUrl(request, '/admin'));
  if (error) url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!adminGoogleAuthConfigured()) {
    return redirectToAdmin(request, 'google_not_configured');
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(ADMIN_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(ADMIN_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToAdmin(request, 'invalid_oauth_state');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl(request),
    }),
  });

  if (!tokenResponse.ok) {
    return redirectToAdmin(request, 'google_token_failed');
  }

  const token = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!token.access_token) {
    return redirectToAdmin(request, 'google_token_failed');
  }

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return redirectToAdmin(request, 'google_profile_failed');
  }

  const profile = (await userInfoResponse.json()) as GoogleUserInfo;
  const email = profile.email?.trim().toLowerCase() || '';
  if (!email || profile.email_verified === false || !isAllowedAdminEmail(email)) {
    return redirectToAdmin(request, 'not_admin');
  }

  await createAdminSession(email);
  return redirectToAdmin(request);
}
