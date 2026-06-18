import { NextResponse } from 'next/server';
import { clearContributorSession, contributorGoogleAuthConfigured, getContributorSession } from '@/lib/contributorAuth';
import { getContributorStats } from '@/lib/db';

export async function GET() {
  const session = await getContributorSession();
  const stats = session ? await getContributorStats(session.email) : { contributionCount: 0, points: 0 };

  return NextResponse.json({
    authenticated: Boolean(session),
    email: session?.email ?? '',
    googleConfigured: contributorGoogleAuthConfigured(),
    ...stats,
  });
}

export async function DELETE() {
  await clearContributorSession();
  return NextResponse.json({ ok: true });
}
