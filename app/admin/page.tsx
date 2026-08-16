import type { Metadata } from 'next';

// 管理画面は robots.txt でも disallow しているが、二重防御で noindex も明示する。
export const metadata: Metadata = {
  title: '管理画面',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">管理画面</h1>
      <p className="mt-4 text-slate-600">管理ツールのプレースホルダーです。</p>
    </main>
  );
}
