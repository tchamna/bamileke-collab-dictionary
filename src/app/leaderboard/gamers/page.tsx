import { Gamepad2, Medal, Sparkles, Target, Trophy } from 'lucide-react';
import Link from 'next/link';
import { listGamerLeaderboard, type GamerLeaderboardRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

function displayName(row: GamerLeaderboardRow) {
  return row.player_name.trim() || maskEmail(row.player_email) || 'Anonymous player';
}

function maskEmail(email: string) {
  const [name, domain = ''] = email.split('@');
  if (!name) return email;
  const visible = name.length <= 2 ? name : `${name.slice(0, 2)}...${name.slice(-1)}`;
  return domain ? `${visible}@${domain}` : visible;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function PodiumCard({ row, place }: { row: GamerLeaderboardRow; place: number }) {
  const featured = place === 1;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
        featured ? 'border-[#e5c15d] lg:-mt-8 lg:p-6' : 'border-[#d8d6c8]'
      }`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#b9d7ca]/35" />
      <div className="relative text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#2f6b58] text-white shadow-lg">
          {place <= 3 ? <Medal className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#74776d]">Rang {row.rank}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#18221d]">{displayName(row)}</h2>
        {row.player_email ? <p className="mt-1 text-sm font-medium text-[#667065]">{maskEmail(row.player_email)}</p> : null}
        <div className="mt-5 rounded-xl bg-[#fbfaf6] p-4">
          <p className="text-4xl font-black text-[#2f6b58]">{row.correct_count * 10}</p>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#74776d]">points</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
          <span className="rounded-lg bg-[#edf1e9] px-3 py-2 text-[#2f6b58]">{row.correct_count} bonnes reponses</span>
          <span className="rounded-lg bg-[#eef0f7] px-3 py-2 text-[#36466f]">serie {row.best_streak}</span>
        </div>
      </div>
    </article>
  );
}

export default async function GamerLeaderboardPage() {
  const rows = await listGamerLeaderboard(100);
  const topThree = rows.slice(0, 3);
  const totalRounds = rows.reduce((sum, row) => sum + row.round_count, 0);
  const totalCorrect = rows.reduce((sum, row) => sum + row.correct_count, 0);

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1d241f]">
      <section className="border-b border-[#ddd6c5] bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0bd] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667065] shadow-sm">
                <Gamepad2 className="h-4 w-4 text-[#2f6b58]" />
                Jeux
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-normal text-[#18221d] sm:text-6xl">
                Classement des joueurs
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-[#62685d]">
                Les scores viennent des parties Word Match sauvegardees dans PostgreSQL. Une bonne reponse vaut 10 points.
              </p>
              <div className="mt-5 inline-flex rounded-lg border border-[#d8d0bd] bg-white p-1 shadow-sm">
                <Link href="/leaderboard" className="rounded-md px-4 py-2 text-sm font-semibold text-[#485047] hover:bg-[#f4f1e8]">
                  Contributeurs
                </Link>
                <Link href="/leaderboard/gamers" className="rounded-md bg-[#2f6b58] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  Joueurs
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[#ddd6c5] bg-white p-3 shadow-sm sm:min-w-[420px]">
              <div className="rounded-xl bg-[#fbfaf6] p-4">
                <p className="text-2xl font-black text-[#18221d]">{rows.length}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#74776d]">joueurs</p>
              </div>
              <div className="rounded-xl bg-[#edf1e9] p-4">
                <p className="text-2xl font-black text-[#2f6b58]">{totalCorrect}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665a]">reussites</p>
              </div>
              <div className="rounded-xl bg-[#eef0f7] p-4">
                <p className="text-2xl font-black text-[#36466f]">{totalRounds}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e6472]">parties</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {topThree.length ? (
          <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
            {topThree.map((row, index) => (
              <PodiumCard key={row.player_key} row={row} place={index + 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ddd6c5] bg-white p-10 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-[#2f6b58]" />
            <h2 className="mt-4 text-2xl font-semibold text-[#18221d]">Aucun joueur classe pour le moment</h2>
            <p className="mt-2 text-[#62685d]">Les scores apparaitront ici apres les premieres parties.</p>
          </div>
        )}

        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-[#ddd6c5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e7e1d4] bg-[#fbfaf6] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#74776d]">Leaderboard</p>
                <h2 className="text-xl font-semibold text-[#18221d]">Tous les joueurs</h2>
              </div>
              <Target className="h-7 w-7 text-[#2f6b58]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead className="bg-white text-xs font-bold uppercase tracking-[0.14em] text-[#74776d]">
                  <tr>
                    <th className="px-5 py-4">Rang</th>
                    <th className="px-5 py-4">Joueur</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Bonnes reponses</th>
                    <th className="px-5 py-4">Parties</th>
                    <th className="px-5 py-4">Meilleure serie</th>
                    <th className="px-5 py-4">Derniere partie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6d8]">
                  {rows.map((row) => (
                    <tr key={row.player_key} className="hover:bg-[#fbfaf6]">
                      <td className="px-5 py-4 text-lg font-black text-[#18221d]">#{row.rank}</td>
                      <td className="px-5 py-4">
                        <p className="text-base font-semibold text-[#18221d]">{displayName(row)}</p>
                        {row.player_email ? <p className="text-sm font-medium text-[#74776d]">{maskEmail(row.player_email)}</p> : null}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xl font-black text-[#2f6b58]">{row.correct_count * 10}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#74776d]">points</p>
                      </td>
                      <td className="px-5 py-4 text-base font-semibold text-[#30352f]">{row.correct_count}</td>
                      <td className="px-5 py-4 text-base font-semibold text-[#30352f]">{row.round_count}</td>
                      <td className="px-5 py-4 text-base font-semibold text-[#36466f]">{row.best_streak}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[#62685d]">{formatDate(row.latest_played_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
