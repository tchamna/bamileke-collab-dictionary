import { NextRequest, NextResponse } from 'next/server';
import { listAdminContributions } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset') || 0);
  const limit = Number(searchParams.get('limit') || 50);
  const result = await listAdminContributions({ q, offset, limit });

  return NextResponse.json({
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    rows: result.rows.map((row) => ({
      id: row.id,
      wordId: row.word_id,
      french: row.french,
      english: row.english,
      nufi: row.nufi_json,
      language: row.language,
      translation: row.translation,
      synonyms: row.synonyms,
      contributorName: row.contributor_name,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at,
    })),
  });
}

