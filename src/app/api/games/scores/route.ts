import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordGameScore } from '@/lib/db';

const scoreSchema = z.object({
  gameId: z.literal('word-match'),
  playerId: z.string().max(120).optional().default(''),
  playerName: z.string().max(120).optional().default(''),
  playerEmail: z.string().email().or(z.literal('')).optional().default(''),
  wordId: z.number().int().positive(),
  preferredLanguage: z.enum(['english', 'french']),
  selectedAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  isCorrect: z.boolean(),
  streak: z.number().int().min(0).max(10000),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = scoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid game score.' }, { status: 400 });
  }

  try {
    const id = await recordGameScore(parsed.data);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save game score.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
