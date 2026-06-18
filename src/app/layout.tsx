import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collaborative Bamileke Dictionary',
  description: 'Community translation interface for Bamileke and related languages.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

