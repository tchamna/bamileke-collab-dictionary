import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminAuth';
import { listAdminWords, upsertAdminWordContribution } from '@/lib/db';

const saveSchema = z.object({
  wordId: z.number().int().positive(),
  contributionId: z.number().int().positive().nullable().optional(),
  language: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(800),
  synonyms: z.string().trim().max(1200).default(''),
  contributorName: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(1200).default(''),
  status: z.enum(['approved', 'pending', 'rejected']).default('pending'),
});

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const language = searchParams.get('language') || 'ghomala';
  const q = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset') || 0);
  const limit = Number(searchParams.get('limit') || 50);
  const result = await listAdminWords({ language, q, offset, limit });

  return NextResponse.json({
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    rows: result.rows.map((row) => ({
      wordId: row.word_id,
      french: row.french,
      english: row.english,
      nufi: row.nufi_json,
      contributionId: row.contribution_id,
      language: row.language ?? language,
      translation: row.translation ?? '',
      synonyms: row.synonyms ?? '',
      contributorName: row.contributor_name ?? '',
      notes: row.notes ?? '',
      status: row.status ?? 'pending',
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contributionId = await upsertAdminWordContribution(parsed.data);
  if (!contributionId) {
    return NextResponse.json({ error: 'Unable to save contribution.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contributionId });
}
