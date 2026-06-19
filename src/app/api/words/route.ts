import { NextRequest, NextResponse } from 'next/server';
import { getRandomWord, listWords } from '@/lib/db';
import { LANGUAGES } from '@/lib/languages';

const languageIds = new Set<string>(LANGUAGES.map((language) => language.id));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedLanguage = searchParams.get('language') || 'ghomala';
  const language = languageIds.has(requestedLanguage) ? requestedLanguage : 'other';
  const q = searchParams.get('q') || '';
  const offset = Number(searchParams.get('offset') || 0);
  const limit = Number(searchParams.get('limit') || 24);
  const random = searchParams.get('random') === '1';
  const excludeId = Number(searchParams.get('excludeId') || 0) || null;

  const result = random ? await getRandomWord({ language, excludeId }) : await listWords({ language, q, offset, limit });
  return NextResponse.json({
    ...result,
    rows: result.rows.map((row) => ({
      id: row.id,
      french: row.french,
      english: row.english,
      nufi: row.nufi_json,
      contributionCount: row.contribution_count,
      latestTranslation: row.latest_translation,
      latestSynonyms: row.latest_synonyms,
    })),
  });
}
