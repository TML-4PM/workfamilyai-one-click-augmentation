import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkFamilyAI — One-Click Augmentation',
  description: 'Deploy AI agents for your business in minutes. Lead gen, customer service, sales, finance, and operations — all automated.',
  icons: { icon: "https://pflisxkcxbzboxwidywf.supabase.co/storage/v1/object/public/images/AHC%20droid%20head.webp", apple: "https://pflisxkcxbzboxwidywf.supabase.co/storage/v1/object/public/images/AHC%20droid%20head.webp" },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    images: ["https://pflisxkcxbzboxwidywf.supabase.co/storage/v1/object/public/images/AHC%20droid%20head.webp"],
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
