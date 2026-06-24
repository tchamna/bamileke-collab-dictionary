import { NextRequest, NextResponse } from 'next/server';
import { getWordMatchRound } from '@/lib/db';
import { LANGUAGES, normalizeLanguageId } from '@/lib/languages';

const languageIds = new Set<string>(LANGUAGES.map((language) => language.id));

function normalizeExcludedLanguage(value: string) {
  if (languageIds.has(value)) return value;
  return normalizeLanguageId(value);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const preferred = searchParams.get('preferred') === 'french' ? 'french' : 'english';
  const excludeId = Number(searchParams.get('excludeId') || 0) || null;
  const previousLanguage = normalizeExcludedLanguage(searchParams.get('previousLanguage') ?? '');
  const excludedLanguages = searchParams
    .getAll('exclude')
    .flatMap((value) => value.split(','))
    .map(normalizeExcludedLanguage)
    .filter(Boolean);

  let round;
  try {
    round = await getWordMatchRound({
      excludedLanguages,
      preferredLanguage: preferred,
      excludeId,
      previousLanguage: previousLanguage || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load game data.';
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!round || round.clues.length === 0 || round.choices.length < 2) {
    return NextResponse.json(
      { message: 'No playable words found with the current known-language exclusions. Use all clue languages or unselect one.' },
      { status: 404 }
    );
  }

  return NextResponse.json(round);
}
