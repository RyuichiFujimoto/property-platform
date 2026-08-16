import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

// canonical / og:url を絶対 URL で出すために必須。未設定だと相対 URL のままになる。
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: '不動産SEOポータル MVP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
