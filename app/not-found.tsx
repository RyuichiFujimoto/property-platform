import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">ページが見つかりません</h1>
      <p className="mt-4 text-slate-600">
        お探しのページは存在しないか、まだ公開されていません。
      </p>
      <Link href="/" className="mt-6 inline-block underline">
        トップページへ
      </Link>
    </main>
  );
}
