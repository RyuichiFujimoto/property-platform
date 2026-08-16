import { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser, isSupabaseConfigured } from '@/lib/auth/session';
import { signOutAction } from '@/lib/owner/actions';
import { listOwnerProperties } from '@/lib/owner/queries';
import { getPublicMansion } from '@/lib/public/mansion';
import AuthForm from './AuthForm';
import OwnerPropertyForm, { type BuildingChoice } from './OwnerPropertyForm';

interface Props {
  searchParams: { mansion?: string };
}

export const metadata: Metadata = {
  title: 'マイマンションに登録',
  description: 'マイマンションに登録すると、自宅の参考価格や相場をいつでも確認できます。',
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ searchParams }: Props) {
  const slug = searchParams.mansion ?? null;
  const mansion = slug ? await getPublicMansion(slug) : null;
  const configured = isSupabaseConfigured();
  const user = await getSessionUser();
  const ownerProperties = user ? await listOwnerProperties(user.id) : [];

  const buildings: BuildingChoice[] = (mansion?.buildings ?? []).map((b) => ({
    id: b.id,
    name: b.buildingLabel ? `${b.canonicalName}（${b.buildingLabel}）` : b.canonicalName,
  }));

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">マイマンションに登録</h1>

      {mansion ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-slate-700">
          対象マンション：
          <Link href={`/mansion/${mansion.slug}`} className="font-medium underline">
            {mansion.canonicalName}
          </Link>
        </p>
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 p-4 text-amber-900">
          対象のマンションが指定されていません。マンションページの「マイマンションに登録」から進んでください。
        </p>
      )}

      <p className="mt-4 text-slate-600">
        マイマンションに登録すると、自宅の参考価格や相場をいつでも確認できます。
      </p>

      {user && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-600">ログイン中：{user.email ?? user.id}</span>
          <form action={signOutAction}>
            <input type="hidden" name="mansionSlug" value={slug ?? ''} />
            <button type="submit" className="text-slate-500 underline">
              ログアウト
            </button>
          </form>
        </div>
      )}

      {ownerProperties.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">登録済みのお部屋</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ownerProperties.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 px-4 py-3 text-slate-700">
                {p.roomNumber ?? '部屋番号未設定'}
                {p.floor ? ` / ${p.floor}階` : ''}
                {p.areaSqm ? ` / ${p.areaSqm}㎡` : ''}
                {p.layout ? ` / ${p.layout}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!configured ? (
        <section className="mt-8 rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">登録機能は準備中です</h2>
          <p className="mt-2 text-slate-600">
            オーナー登録の受付開始までお待ちください。公開中のマンション情報は引き続きご覧いただけます。
          </p>
          <Link
            href={mansion ? `/mansion/${mansion.slug}` : '/'}
            className="mt-4 inline-block rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
          >
            {mansion ? 'マンションページに戻る' : 'トップページへ'}
          </Link>
        </section>
      ) : !user ? (
        <AuthForm mansionSlug={slug} />
      ) : mansion ? (
        <OwnerPropertyForm mansionSlug={mansion.slug} buildings={buildings} />
      ) : (
        <p className="mt-8 text-slate-600">
          <Link href="/" className="underline">
            トップページ
          </Link>
          からマンションを選んでください。
        </p>
      )}
    </main>
  );
}
