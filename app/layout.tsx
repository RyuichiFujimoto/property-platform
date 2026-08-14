import './globals.css';

export const metadata = {
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
