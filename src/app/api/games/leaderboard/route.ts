import { NextResponse } from 'next/server';
import { listGamerLeaderboard } from '@/lib/db';

export async function GET() {
  const rows = await listGamerLeaderboard(100);

  return NextResponse.json({
    rows: rows.map((row) => ({
      playerKey: row.player_key,
      playerName: row.player_name,
      playerEmail: row.player_email,
      roundCount: row.round_count,
      correctCount: row.correct_count,
      points: row.correct_count * 10,
      bestStreak: row.best_streak,
      latestPlayedAt: row.latest_played_at,
      rank: row.rank,
      rankedPlayerCount: row.ranked_player_count,
    })),
    total: rows[0]?.ranked_player_count ?? 0,
  });
}
