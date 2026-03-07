import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkFamilyAI — One-Click Augmentation',
  description: 'Deploy AI agents for your business in minutes. Lead gen, customer service, sales, finance, and operations — all automated.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
