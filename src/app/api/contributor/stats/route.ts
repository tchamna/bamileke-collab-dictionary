import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeContributorEmail } from '@/lib/contributorAuth';
import { getContributorStats } from '@/lib/db';

const emailSchema = z.string().trim().email();

export async function GET(request: NextRequest) {
  const email = new URL(request.url).searchParams.get('email') || '';
  const parsed = emailSchema.safeParse(email);

  if (!parsed.success) {
    return NextResponse.json({ contributionCount: 0, points: 0, rank: null, rankedContributorCount: 0 });
  }

  const stats = await getContributorStats(normalizeContributorEmail(parsed.data));
  return NextResponse.json(stats);
}
