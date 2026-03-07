import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkFamilyAI — One-Click Augmentation',
  description: 'Deploy AI agents for your business in minutes. Lead gen, customer service, sales, finance, and operations — all automated.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'WorkFamilyAI — One-Click Augmentation',
    description: 'Deploy AI agents for your business in minutes.',
    images: [{ url: '/icon-192.png', width: 192, height: 192 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
