import type { Metadata } from 'next';
import { AppNav } from '@/components/AppNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collaborative Bamileke Dictionary',
  description: 'Community translation interface for Bamileke and related languages.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
