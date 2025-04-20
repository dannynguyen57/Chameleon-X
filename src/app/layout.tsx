import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chameleon X - Social Deduction Word Game',
  description: 'A social deduction word game where players must find the Chameleon who doesn\'t know the secret word. Blend in or stand out?',
  keywords: ['game', 'social deduction', 'word game', 'chameleon', 'multiplayer'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
} 