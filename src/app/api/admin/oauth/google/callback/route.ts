import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_OAUTH_STATE_COOKIE,
  createAdminSession,
  isAllowedAdminEmail,
} from '@/lib/adminAuth';
import {
  CONTRIBUTOR_OAUTH_STATE_COOKIE,
  contributorGoogleAuthConfigured,
  createContributorSession,
} from '@/lib/contributorAuth';
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

function redirectToContributor(request: NextRequest, error?: string) {
  const url = new URL(publicUrl(request, '/'));
  if (error) url.searchParams.set('contributorError', error);
  return NextResponse.redirect(url);
}

function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function exchangeCodeForToken(request: NextRequest, code: string) {
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

  if (!tokenResponse.ok) return null;
  const token = (await tokenResponse.json()) as GoogleTokenResponse;
  return token.access_token || null;
}

async function getGoogleProfile(accessToken: string) {
  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) return null;
  return (await userInfoResponse.json()) as GoogleUserInfo;
}

export async function GET(request: NextRequest) {
  if (!googleAuthConfigured()) {
    return redirectToAdmin(request, 'google_not_configured');
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const adminExpectedState = cookieStore.get(ADMIN_OAUTH_STATE_COOKIE)?.value;
  const contributorExpectedState = cookieStore.get(CONTRIBUTOR_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(ADMIN_OAUTH_STATE_COOKIE);
  cookieStore.delete(CONTRIBUTOR_OAUTH_STATE_COOKIE);

  const isAdminFlow = Boolean(state && adminExpectedState && state === adminExpectedState);
  const isContributorFlow = Boolean(state && contributorExpectedState && state === contributorExpectedState);
  if (!code || !state || (!isAdminFlow && !isContributorFlow)) {
    return redirectToAdmin(request, 'invalid_oauth_state');
  }

  const accessToken = await exchangeCodeForToken(request, code);
  if (!accessToken) return isContributorFlow ? redirectToContributor(request, 'google_token_failed') : redirectToAdmin(request, 'google_token_failed');

  const profile = await getGoogleProfile(accessToken);
  if (!profile) return isContributorFlow ? redirectToContributor(request, 'google_profile_failed') : redirectToAdmin(request, 'google_profile_failed');

  const email = profile.email?.trim().toLowerCase() || '';
  if (!email || profile.email_verified === false) {
    return isContributorFlow ? redirectToContributor(request, 'google_profile_failed') : redirectToAdmin(request, 'google_profile_failed');
  }

  if (isContributorFlow) {
    if (!contributorGoogleAuthConfigured()) return redirectToContributor(request, 'google_not_configured');
    await createContributorSession(email);
    return redirectToContributor(request);
  }

  if (!isAllowedAdminEmail(email)) {
    return redirectToAdmin(request, 'not_admin');
  }

  await createAdminSession(email);
  return redirectToAdmin(request);
}
