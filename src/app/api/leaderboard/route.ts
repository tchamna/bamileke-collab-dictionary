import { NextResponse } from 'next/server';
import { listContributorLeaderboard } from '@/lib/db';

export async function GET() {
  const rows = await listContributorLeaderboard(100);

  return NextResponse.json({
    rows: rows.map((row) => ({
      email: row.contributor_email,
      name: row.contributor_name,
      contributionCount: row.contribution_count,
      points: row.points,
      approvedCount: row.approved_count,
      pendingCount: row.pending_count,
      reviewAdjustmentPoints: row.review_adjustment_points,
      languageCount: row.language_count,
      languages: row.languages,
      latestContributionAt: row.latest_contribution_at,
      rank: row.rank,
      rankedContributorCount: row.ranked_contributor_count,
    })),
    total: rows[0]?.ranked_contributor_count ?? 0,
  });
}
