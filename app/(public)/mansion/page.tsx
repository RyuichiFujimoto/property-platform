import type { Metadata } from 'next';

// 中身がプレースホルダーのうちは thin page なので index させない。
export const metadata: Metadata = {
  title: 'マンション一覧',
  robots: { index: false, follow: true },
};

export default function MansionsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">マンション一覧</h1>
      <p className="mt-4 text-slate-600">マンション情報のプレースホルダーです。</p>
    </main>
  );
}
