import { NextResponse } from 'next/server';
import { listPlayableGameLanguages } from '@/lib/db';
import { getLanguageLabel } from '@/lib/languages';

export async function GET() {
  const rows = await listPlayableGameLanguages();

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.language,
      label: getLanguageLabel(row.language),
      wordCount: row.word_count,
    })),
  });
}
