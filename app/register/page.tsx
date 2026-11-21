import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicMansion } from '@/lib/public/mansion';

interface Props {
  searchParams: { mansion?: string };
}

export const metadata: Metadata = {
  title: 'マイマンションに登録',
  description: 'マイマンションに登録すると、自宅の参考価格や相場をいつでも確認できます。',
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ searchParams }: Props) {
  const slug = searchParams.mansion;
  const mansion = slug ? await getPublicMansion(slug) : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">マイマンションに登録</h1>

      {mansion && (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-slate-700">
          対象マンション：
          <Link href={`/mansion/${mansion.slug}`} className="font-medium underline">
            {mansion.canonicalName}
          </Link>
        </p>
      )}

      <p className="mt-4 text-slate-600">
        マイマンションに登録すると、自宅の参考価格や相場をいつでも確認できます。
      </p>

      <section className="mt-8 rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">登録機能は準備中です</h2>
        <p className="mt-2 text-slate-600">
          オーナー登録の受付開始までお待ちください。公開中のマンション情報は引き続きご覧いただけます。
        </p>
        <Link
          href={mansion ? `/mansion/${mansion.slug}` : '/mansion'}
          className="mt-4 inline-block rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
        >
          {mansion ? 'マンションページに戻る' : 'マンション一覧を見る'}
        </Link>
      </section>
    </main>
  );
}
