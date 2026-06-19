import { NextRequest, NextResponse } from 'next/server';
import { listComparisonWords } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset') || 0);
  const limit = Number(searchParams.get('limit') || 20);

  const result = await listComparisonWords({ q, offset, limit });
  return NextResponse.json({
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    rows: result.rows.map((row) => ({
      id: row.id,
      french: row.french,
      english: row.english,
      nufi: row.nufi_json,
      languageCount: row.language_count,
      contributionCount: row.contribution_count,
      contributions: (result.contributionsByWordId.get(row.id) ?? []).map((contribution) => ({
        id: contribution.id,
        language: contribution.language,
        translation: contribution.translation,
        synonyms: contribution.synonyms,
        contributorName: contribution.contributor_name,
        notes: contribution.notes,
        status: contribution.status,
        createdAt: contribution.created_at,
      })),
    })),
  });
}
