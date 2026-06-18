import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createContribution, getWord } from '@/lib/db';
import { LANGUAGES } from '@/lib/languages';

const languageIds = new Set<string>(LANGUAGES.map((language) => language.id));

const contributionSchema = z.object({
  wordId: z.number().int().positive(),
  language: z.string().min(1).max(80),
  translation: z.string().trim().min(1, 'Translation is required.').max(800),
  synonyms: z.string().trim().max(1200).optional().default(''),
  contributorName: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(1200).optional().default(''),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = contributionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const word = await getWord(parsed.data.wordId);
  if (!word) {
    return NextResponse.json({ error: 'Word not found.' }, { status: 404 });
  }

  const language = languageIds.has(parsed.data.language) ? parsed.data.language : 'other';
  const id = await createContribution({ ...parsed.data, language });
  return NextResponse.json({ ok: true, id });
}
