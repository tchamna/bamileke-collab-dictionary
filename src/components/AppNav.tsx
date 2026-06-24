'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Gamepad2, GitCompareArrows, ShieldCheck, SquarePen } from 'lucide-react';

const navItems = [
  { href: '/', labels: { english: 'Contribute', french: 'Contribuer' }, icon: SquarePen },
  { href: '/compare', labels: { english: 'Compare', french: 'Comparer' }, icon: GitCompareArrows },
  { href: '/games', labels: { english: 'Games', french: 'Jeux' }, icon: Gamepad2 },
  { href: '/resources', labels: { english: 'Resources', french: 'Ressources' }, icon: BookOpen },
  { href: '/leaderboard', labels: { english: 'Leaderboard', french: 'Classement' }, icon: BarChart3 },
  { href: '/admin', labels: { english: 'Admin', french: 'Admin' }, icon: ShieldCheck },
];

export function AppNav() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<'english' | 'french'>('french');

  useEffect(() => {
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    setLocale(browserLanguages[0]?.toLocaleLowerCase().startsWith('en') ? 'english' : 'french');
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d8d6c8] bg-[#fbfaf6]/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Link href="/" className="mr-auto min-w-0 text-sm font-black uppercase tracking-[0.18em] text-[#295f4e]">
          <span className="hidden sm:inline">Bamileke Dictionary</span>
          <span className="sm:hidden">Dictionary</span>
        </Link>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-[#ded8c8] bg-white p-1 shadow-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded px-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#295f4e] text-white shadow-sm' : 'text-[#485047] hover:bg-[#f4f3ed] hover:text-[#295f4e]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.labels[locale]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
