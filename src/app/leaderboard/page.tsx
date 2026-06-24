import { Award, Crown, Medal, Sparkles, Trophy } from 'lucide-react';
import { listContributorLeaderboard, type ContributorLeaderboardRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

function displayName(row: ContributorLeaderboardRow) {
  return row.contributor_name.trim() || maskEmail(row.contributor_email);
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

function medalStyle(rank: number) {
  if (rank === 1) {
    return {
      shell: 'from-[#fff3b8] via-[#f5c84c] to-[#b97716] text-[#3b2608] shadow-[#d39b24]/25',
      ribbon: 'from-[#f14d4d] to-[#9f1d2e]',
      label: 'Or',
    };
  }
  if (rank === 2) {
    return {
      shell: 'from-[#f7fafc] via-[#cfd8e3] to-[#8491a3] text-[#1f2937] shadow-[#8794a6]/25',
      ribbon: 'from-[#3f7fbf] to-[#234a86]',
      label: 'Argent',
    };
  }
  return {
    shell: 'from-[#ffddb8] via-[#c2844f] to-[#7a4322] text-[#2c1608] shadow-[#a86435]/25',
    ribbon: 'from-[#2f6b58] to-[#174335]',
    label: 'Bronze',
  };
}

function MedalBadge({ rank, size = 'large' }: { rank: number; size?: 'large' | 'small' }) {
  const style = medalStyle(rank);
  const isLarge = size === 'large';

  return (
    <div className={`relative mx-auto ${isLarge ? 'h-24 w-20' : 'h-12 w-10'}`} aria-label={`Medaille ${style.label}`}>
      <div
        className={`absolute left-1/2 top-0 -translate-x-1/2 bg-gradient-to-b ${style.ribbon} shadow-sm ${
          isLarge ? 'h-11 w-9 rounded-b-md' : 'h-6 w-5 rounded-b'
        }`}
      />
      <div
        className={`absolute left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br ${style.shell} shadow-lg ${
          isLarge ? 'top-7 h-16 w-16 shadow-lg' : 'top-4 h-8 w-8'
        }`}
      >
        <Medal className={isLarge ? 'h-8 w-8' : 'h-4 w-4'} />
        <span className={`absolute font-black ${isLarge ? 'bottom-2 text-xs' : 'bottom-0.5 text-[8px]'}`}>#{rank}</span>
      </div>
    </div>
  );
}

function PodiumCard({ row, place }: { row: ContributorLeaderboardRow; place: number }) {
  const featured = place === 1;
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
        featured ? 'border-[#e5c15d] lg:-mt-8 lg:p-6' : 'border-[#e3ddcf]'
      }`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#f6d56d]/20" />
      <div className="relative">
        <MedalBadge rank={place} />
        <div className="mt-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#74776d]">Rang {row.rank}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#18221d]">{displayName(row)}</h2>
          <p className="mt-1 text-sm font-medium text-[#667065]">{maskEmail(row.contributor_email)}</p>
          <div className="mt-5 rounded-xl bg-[#fbfaf6] p-4">
            <p className="text-4xl font-black text-[#2f6b58]">{row.contribution_count * 50}</p>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#74776d]">points</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            <span className="rounded-lg bg-[#edf1e9] px-3 py-2 text-[#2f6b58]">{row.contribution_count} contributions</span>
            <span className="rounded-lg bg-[#f3efe6] px-3 py-2 text-[#6b6252]">{row.language_count} langues</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function LeaderboardPage() {
  const rows = await listContributorLeaderboard(100);
  const topThree = rows.slice(0, 3);
  const totalPoints = rows.reduce((sum, row) => sum + row.contribution_count * 50, 0);
  const totalContributions = rows.reduce((sum, row) => sum + row.contribution_count, 0);

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#1d241f]">
      <section className="border-b border-[#ddd6c5] bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0bd] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667065] shadow-sm">
                <Trophy className="h-4 w-4 text-[#c58a22]" />
                Tableau d'honneur
              </div>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-normal text-[#18221d] sm:text-6xl">
                Classement des contributeurs
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-[#62685d]">
                Chaque contribution valide compte pour 50 points. Les entrees rejetees ne comptent pas dans le score.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[#ddd6c5] bg-white p-3 shadow-sm sm:min-w-[420px]">
              <div className="rounded-xl bg-[#fbfaf6] p-4">
                <p className="text-2xl font-black text-[#18221d]">{rows.length}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#74776d]">contributeurs</p>
              </div>
              <div className="rounded-xl bg-[#edf1e9] p-4">
                <p className="text-2xl font-black text-[#2f6b58]">{totalContributions}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#53665a]">entrees</p>
              </div>
              <div className="rounded-xl bg-[#fff7df] p-4">
                <p className="text-2xl font-black text-[#9b6415]">{totalPoints}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#80622e]">points</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {topThree.length ? (
          <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
            {topThree.map((row, index) => (
              <PodiumCard key={row.contributor_email} row={row} place={index + 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ddd6c5] bg-white p-10 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-[#2f6b58]" />
            <h2 className="mt-4 text-2xl font-semibold text-[#18221d]">Aucun contributeur classe pour le moment</h2>
            <p className="mt-2 text-[#62685d]">Les scores apparaitront ici apres les premieres contributions.</p>
          </div>
        )}

        {rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-[#ddd6c5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e7e1d4] bg-[#fbfaf6] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#74776d]">Leaderboard</p>
                <h2 className="text-xl font-semibold text-[#18221d]">Tous les contributeurs</h2>
              </div>
              <Award className="h-7 w-7 text-[#2f6b58]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead className="bg-white text-xs font-bold uppercase tracking-[0.14em] text-[#74776d]">
                  <tr>
                    <th className="px-5 py-4">Rang</th>
                    <th className="px-5 py-4">Contributeur</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Contributions</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Langues</th>
                    <th className="px-5 py-4">Derniere activite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6d8]">
                  {rows.map((row) => (
                    <tr key={row.contributor_email} className="hover:bg-[#fbfaf6]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {row.rank <= 3 ? <MedalBadge rank={row.rank} size="small" /> : null}
                          <span className="text-lg font-black text-[#18221d]">#{row.rank}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-base font-semibold text-[#18221d]">{displayName(row)}</p>
                        <p className="text-sm font-medium text-[#74776d]">{maskEmail(row.contributor_email)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xl font-black text-[#2f6b58]">{row.contribution_count * 50}</p>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#74776d]">points</p>
                      </td>
                      <td className="px-5 py-4 text-base font-semibold text-[#30352f]">{row.contribution_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2 text-sm font-semibold">
                          <span className="rounded-full bg-[#edf1e9] px-3 py-1 text-[#2f6b58]">{row.approved_count} approuvees</span>
                          <span className="rounded-full bg-[#fff7df] px-3 py-1 text-[#9b6415]">{row.pending_count} en attente</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#30352f]">{row.language_count}</p>
                        <p className="max-w-xs truncate text-sm text-[#74776d]">{row.languages.join(', ')}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#62685d]">{formatDate(row.latest_contribution_at)}</td>
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
