'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Check, Gamepad2, Languages, Mail, RotateCcw, SkipForward, Sparkles, Trophy, User, X } from 'lucide-react';
import { getLanguageLabel } from '@/lib/languages';
import { GameBackgroundMusic } from '@/components/GameBackgroundMusic';

type LanguageOption = {
  id: string;
  label: string;
  wordCount?: number;
};

type PreferredLanguage = 'english' | 'french';

type GameRound = {
  id: number;
  french: string;
  english: string;
  clues: {
    language: string;
    translation: string;
  }[];
  correctAnswer: string;
  choices: string[];
  answerLanguage?: PreferredLanguage;
};

const KNOWN_LANGUAGES_STORAGE_KEY = 'bamilekeGameKnownLanguages';
const PREFERRED_LANGUAGE_STORAGE_KEY = 'bamilekeGamePreferredLanguage';
const PLAYER_ID_STORAGE_KEY = 'bamilekeGamePlayerId';
const PLAYER_NAME_STORAGE_KEY = 'bamilekeGamePlayerName';
const PLAYER_EMAIL_STORAGE_KEY = 'bamilekeGamePlayerEmail';

function shuffleItems<T>(values: T[]) {
  return [...values].sort(() => Math.random() - 0.5);
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase()}`);
}

export function GamesWorkspace({ languages }: { languages: readonly LanguageOption[] }) {
  const fallbackLanguages = useMemo(() => languages.filter((language) => language.id !== 'other'), [languages]);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const playableLanguages = availableLanguages.length ? availableLanguages : fallbackLanguages;
  const [knownLanguages, setKnownLanguages] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('english');
  const [isReady, setIsReady] = useState(false);
  const [round, setRound] = useState<GameRound | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [lastQuestionLanguage, setLastQuestionLanguage] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isShowingAllClues, setIsShowingAllClues] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');

  const knownLanguageSet = useMemo(() => new Set(knownLanguages), [knownLanguages]);
  const visibleClues = useMemo(
    () => round?.clues.filter((clue) => !knownLanguageSet.has(clue.language)) ?? [],
    [knownLanguageSet, round]
  );
  const primaryClue = visibleClues[0] ?? null;
  const displayedClues = isShowingAllClues ? visibleClues : primaryClue ? [primaryClue] : [];
  const isAnswered = Boolean(selectedAnswer);
  const isCorrect = selectedAnswer && round ? selectedAnswer === round.correctAnswer : false;

  useEffect(() => {
    const storedKnownLanguages = window.localStorage.getItem(KNOWN_LANGUAGES_STORAGE_KEY);
    const storedPreferredLanguage = window.localStorage.getItem(PREFERRED_LANGUAGE_STORAGE_KEY);

    if (storedKnownLanguages) {
      try {
        const parsed = JSON.parse(storedKnownLanguages) as unknown;
        if (Array.isArray(parsed)) setKnownLanguages(parsed.filter((value): value is string => typeof value === 'string'));
      } catch {
        window.localStorage.removeItem(KNOWN_LANGUAGES_STORAGE_KEY);
      }
    }

    if (storedPreferredLanguage === 'english' || storedPreferredLanguage === 'french') {
      setPreferredLanguage(storedPreferredLanguage);
    }
    const storedPlayerId = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    } else {
      const nextPlayerId = crypto.randomUUID();
      window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, nextPlayerId);
      setPlayerId(nextPlayerId);
    }
    setPlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? '');
    setPlayerEmail(window.localStorage.getItem(PLAYER_EMAIL_STORAGE_KEY) ?? '');
    setIsReady(true);
  }, []);

  useEffect(() => {
    fetch('/api/games/languages', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: { rows?: LanguageOption[] }) => {
        const rows = payload.rows ?? [];
        setAvailableLanguages(rows);
        if (rows.length) {
          const availableIds = new Set(rows.map((language) => language.id));
          setKnownLanguages((current) => current.filter((languageId) => availableIds.has(languageId)));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(KNOWN_LANGUAGES_STORAGE_KEY, JSON.stringify(knownLanguages));
  }, [knownLanguages, isReady]);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(PREFERRED_LANGUAGE_STORAGE_KEY, preferredLanguage);
  }, [preferredLanguage, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const trimmedName = playerName.trim();
    if (trimmedName) window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName);
    else window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
  }, [playerName, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const trimmedEmail = playerEmail.trim().toLowerCase();
    if (trimmedEmail) window.localStorage.setItem(PLAYER_EMAIL_STORAGE_KEY, trimmedEmail);
    else window.localStorage.removeItem(PLAYER_EMAIL_STORAGE_KEY);
  }, [playerEmail, isReady]);

  useEffect(() => {
    if (!isReady) return;
    void loadRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, preferredLanguage, knownLanguages.join('|')]);

  function languageLabel(languageId: string) {
    return getLanguageLabel(languageId);
  }

  function toggleKnownLanguage(languageId: string) {
    setSelectedAnswer('');
    setLastQuestionLanguage(null);
    setKnownLanguages((current) =>
      current.includes(languageId) ? current.filter((item) => item !== languageId) : [...current, languageId]
    );
  }

  function clearKnownLanguages() {
    setKnownLanguages([]);
    setSelectedAnswer('');
    setLastQuestionLanguage(null);
    setMessage('');
  }

  async function loadRound(excludeCurrent = false) {
    setIsLoading(true);
    setMessage('');
    setSelectedAnswer('');
    setIsShowingAllClues(false);
    setRound(null);
    setChoices([]);

    const params = new URLSearchParams();
    params.set('preferred', preferredLanguage);
    if (excludeCurrent && round) params.set('excludeId', String(round.id));
    if (lastQuestionLanguage) params.set('previousLanguage', lastQuestionLanguage);
    for (const language of knownLanguages) params.append('exclude', language);

    const response = await fetch(`/api/games/word-match?${params.toString()}`, { cache: 'no-store' });
    setIsLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setRound(null);
      setChoices([]);
      setMessage(payload?.message ?? 'No playable words found. Keep at least one Bamileke language available for clues.');
      return;
    }

    const payload = (await response.json()) as GameRound;
    setRound({
      ...payload,
      clues: payload.clues.filter((clue) => !knownLanguageSet.has(clue.language)),
    });
    setLastQuestionLanguage(payload.clues.find((clue) => !knownLanguageSet.has(clue.language))?.language ?? null);
    setChoices(shuffleItems(payload.choices));
  }

  function chooseAnswer(answer: string) {
    if (!round || isAnswered) return;
    const nextStreak = answer === round.correctAnswer ? streak + 1 : 0;
    setSelectedAnswer(answer);
    setAttempts((current) => current + 1);

    if (answer === round.correctAnswer) {
      setScore((current) => current + 1);
      setStreak(nextStreak);
    } else {
      setStreak(0);
    }

    void fetch('/api/games/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'word-match',
        playerId,
        playerName,
        playerEmail,
        wordId: round.id,
        preferredLanguage: round.answerLanguage ?? preferredLanguage,
        selectedAnswer: answer,
        correctAnswer: round.correctAnswer,
        isCorrect: answer === round.correctAnswer,
        streak: nextStreak,
      }),
    }).catch(() => undefined);
  }

  function resetScore() {
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setSelectedAnswer('');
  }

  return (
    <main className="min-h-screen bg-[#f2f4ee] text-[#17211c]">
      <section className="border-b border-[#d8d6c8] bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d4d8c8] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#355f4f] shadow-sm">
              <Gamepad2 className="h-4 w-4" />
              Games
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#17211c] sm:text-5xl">Word Match</h1>
            <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#5c655b]">
              Read the Bamileke clues, then choose the matching {preferredLanguage === 'english' ? 'English' : 'French'} word.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#d8d6c8] bg-white p-3 shadow-sm">
            <div className="rounded-lg bg-[#edf3ef] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6a61]">Score</p>
              <p className="mt-1 text-3xl font-semibold text-[#1e5b47]">{score}</p>
            </div>
            <div className="rounded-lg bg-[#f6efe4] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a6258]">Rounds</p>
              <p className="mt-1 text-3xl font-semibold text-[#684d2e]">{attempts}</p>
            </div>
            <div className="rounded-lg bg-[#eef0f7] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e6472]">Streak</p>
              <p className="mt-1 text-3xl font-semibold text-[#36466f]">{streak}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[330px_1fr] lg:px-8">
        <aside className="grid content-start gap-4">
          <div className="rounded-xl border border-[#d8d6c8] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Languages className="h-5 w-5 shrink-0 text-[#2f6b58]" />
                <h2 className="truncate text-lg font-semibold text-[#17211c]">Available languages</h2>
              </div>
              {knownLanguages.length ? (
                <button
                  type="button"
                  onClick={clearKnownLanguages}
                  className="shrink-0 rounded-md border border-[#c9cabc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#355f4f] hover:border-[#2f6b58]"
                >
                  Use all
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-[#62685d]">
              Select any available languages you want to <span className="font-bold text-[#b23b2e]">exclude</span> from the clue list.
            </p>
            <div className="mt-4 flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
              {playableLanguages.map((language) => {
                const selected = knownLanguageSet.has(language.id);
                return (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => toggleKnownLanguage(language.id)}
                    className={`inline-flex h-9 max-w-full items-center gap-2 rounded-full border px-3 text-left text-sm font-semibold transition ${
                      selected
                        ? 'border-[#b23b2e] bg-[#fff1ee] text-[#7a2f24]'
                        : 'border-[#d8d6c8] bg-[#fbfaf6] text-[#3f473f] hover:border-[#2f6b58]'
                    }`}
                  >
                    <span className="truncate">{language.label}</span>
                    {language.wordCount ? <span className="text-xs opacity-70">{language.wordCount}</span> : null}
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#d8d6c8] bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#17211c]">Answer language</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#f2f4ee] p-1">
              {(['english', 'french'] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setPreferredLanguage(language)}
                  className={`h-10 rounded-md text-sm font-semibold capitalize transition ${
                    preferredLanguage === language ? 'bg-[#2f6b58] text-white shadow-sm' : 'text-[#465247] hover:bg-white'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <GameBackgroundMusic />

          <a
            href="/resources"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[#c9cabc] bg-white px-4 text-sm font-semibold text-[#355f4f] shadow-sm hover:border-[#2f6b58]"
          >
            <BookOpen className="h-4 w-4" />
            Learning resources
          </a>

          <div className="rounded-xl border border-[#d8d6c8] bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#17211c]">Player profile</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-[#30372f]">
                Name
                <span className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687064]" />
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#d8d6c8] bg-[#fbfaf6] pl-10 pr-3 text-base font-medium outline-none transition focus:border-[#2f6b58] focus:bg-white focus:ring-4 focus:ring-[#2f6b58]/10"
                    placeholder="Player name"
                  />
                </span>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#30372f]">
                Email
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687064]" />
                  <input
                    type="email"
                    value={playerEmail}
                    onChange={(event) => setPlayerEmail(event.target.value)}
                    className="h-11 w-full rounded-md border border-[#d8d6c8] bg-[#fbfaf6] pl-10 pr-3 text-base font-medium outline-none transition focus:border-[#2f6b58] focus:bg-white focus:ring-4 focus:ring-[#2f6b58]/10"
                    placeholder="name@example.com"
                  />
                </span>
              </label>
              <a
                href="/leaderboard/gamers"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-3 text-sm font-semibold text-[#355f4f] shadow-sm hover:border-[#2f6b58]"
              >
                <BarChart3 className="h-4 w-4" />
                Gamer leaderboard
              </a>
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="overflow-hidden rounded-xl border border-[#d8d6c8] bg-white shadow-sm">
            <div className="border-b border-[#e4e2d8] bg-[#fbfaf6] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74776d]">Game 1</p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#17211c]">Choose the meaning</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetScore}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9cabc] bg-white px-3 text-sm font-semibold text-[#355f4f] shadow-sm hover:border-[#2f6b58]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadRound(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f6b58] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255645]"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-6">
              {message ? (
                <div className="flex flex-col gap-3 rounded-md border border-[#e4c7b3] bg-[#fff8f3] px-4 py-3 text-[#7a3d2f] sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">{message}</p>
                  {knownLanguages.length ? (
                    <button
                      type="button"
                      onClick={clearKnownLanguages}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-[#2f6b58] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#255645]"
                    >
                      Use all clue languages
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isLoading ? (
                <div className="h-80 animate-pulse rounded-xl border border-[#e4e2d8] bg-[#fbfaf6]" />
              ) : round ? (
                <>
                  <div className="rounded-xl border border-[#e1dfd4] bg-[#f7f8f3] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6c7268]">Bamileke clues</p>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#d8d6c8] bg-white px-3 py-1 text-sm font-semibold text-[#355f4f]">
                        <Sparkles className="h-4 w-4" />
                        {displayedClues.length} clue{displayedClues.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {displayedClues.map((clue, index) => (
                        <button
                          key={`${clue.language}-${clue.translation}-${index}`}
                          type="button"
                          onClick={() => setIsShowingAllClues(true)}
                          className="rounded-lg border border-[#d8d6c8] bg-white px-4 py-3 text-left transition hover:border-[#2f6b58] hover:bg-[#f7fbf8]"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#697064]">{languageLabel(clue.language)}</p>
                          <p className="mt-2 text-2xl font-semibold leading-tight text-[#17211c]">{normalizeText(clue.translation)}</p>
                        </button>
                      ))}
                    </div>
                    {!isShowingAllClues && visibleClues.length > 1 ? (
                      <p className="mt-3 text-sm font-semibold text-[#355f4f]">Click the clue to reveal this word in other available languages.</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {choices.map((choice) => {
                      const selected = selectedAnswer === choice;
                      const correct = isAnswered && choice === round.correctAnswer;
                      const wrong = selected && selectedAnswer !== round.correctAnswer;
                      return (
                        <button
                          key={choice}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => chooseAnswer(choice)}
                          className={`min-h-20 rounded-xl border px-4 py-3 text-left text-lg font-semibold leading-snug shadow-sm transition ${
                            correct
                              ? 'border-[#2f6b58] bg-[#e7f4ee] text-[#174c39]'
                              : wrong
                                ? 'border-[#b85d4d] bg-[#fff1ee] text-[#7a2f24]'
                                : 'border-[#d8d6c8] bg-white text-[#17211c] hover:border-[#2f6b58] hover:bg-[#f7fbf8]'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span>{normalizeText(choice)}</span>
                            {correct ? <Check className="h-5 w-5 shrink-0" /> : wrong ? <X className="h-5 w-5 shrink-0" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-[#d8d6c8] bg-[#fbfaf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-10 w-10 place-items-center rounded-md ${
                            isCorrect ? 'bg-[#2f6b58] text-white' : 'bg-[#b85d4d] text-white'
                          }`}
                        >
                          {isCorrect ? <Trophy className="h-5 w-5" /> : <X className="h-5 w-5" />}
                        </span>
                        <p className="text-base font-semibold text-[#17211c]">
                          {isCorrect ? 'Correct.' : `Correct answer: ${normalizeText(round.correctAnswer)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadRound(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2f6b58] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#255645]"
                      >
                        <SkipForward className="h-4 w-4" />
                        Next round
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

        </div>
      </section>
    </main>
  );
}
