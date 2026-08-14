import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPublicMansion, isPreviewMode } from '@/lib/public/mansion';

// generateMetadata と本体で同じリクエスト内のクエリを重複させない
const getMansion = cache(getPublicMansion);

interface Props {
  params: { slug: string };
}

export const revalidate = 3600;

function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getMansion(params.slug);

  if (!data) {
    return {
      title: 'マンションが見つかりません',
      robots: { index: false, follow: false },
    };
  }

  const title = data.canonicalName;
  const description = data.address
    ? `${data.address}のマンション情報。${data.nearestStation ?? ''}`
    : `${data.canonicalName}のマンション情報`;
  const url = `/mansion/${data.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    alternates: {
      canonical: url,
    },
    // プレビュー環境はサンプルデータを含むため index させない
    robots: isPreviewMode() ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function MansionDetailPage({ params }: Props) {
  const data = await getMansion(params.slug);

  if (!data) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: data.canonicalName,
    numberOfAccommodationUnits: data.totalUnits ?? undefined,
    address: data.address
      ? {
          '@type': 'PostalAddress',
          addressLocality: data.ward ?? '',
          streetAddress: data.address,
          addressRegion: '東京都',
          addressCountry: 'JP',
        }
      : undefined,
    containsPlace: data.buildings.map((b) => ({
      '@type': 'Residence',
      name: b.canonicalName,
      numberOfAccommodationUnits: b.totalUnits ?? undefined,
    })),
  };

  const hasBasicInfo =
    data.structure || data.developer || data.constructorName || data.managementCompany;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />

      <section className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{data.canonicalName}</h1>
        {data.address && <p className="mt-2 text-slate-600">{data.address}</p>}
        {data.nearestStation && (
          <p className="mt-1 text-slate-500">最寄駅：{data.nearestStation}</p>
        )}
        {(data.builtYear || data.totalUnits) && (
          <p className="mt-2 text-sm text-slate-500">
            {data.builtYear
              ? `竣工：${data.builtYear}年${data.builtMonth ? `${data.builtMonth}月` : ''}`
              : ''}
            {data.builtYear && data.totalUnits ? ' / ' : ''}
            {data.totalUnits ? `総戸数：${data.totalUnits}戸` : ''}
          </p>
        )}
      </section>

      {hasBasicInfo ? (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">基本情報</h2>
          <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {data.structure && (
              <>
                <dt className="text-slate-500">構造</dt>
                <dd className="text-slate-800">{data.structure}</dd>
              </>
            )}
            {data.developer && (
              <>
                <dt className="text-slate-500">デベロッパー</dt>
                <dd className="text-slate-800">{data.developer}</dd>
              </>
            )}
            {data.constructorName && (
              <>
                <dt className="text-slate-500">施工会社</dt>
                <dd className="text-slate-800">{data.constructorName}</dd>
              </>
            )}
            {data.managementCompany && (
              <>
                <dt className="text-slate-500">管理会社</dt>
                <dd className="text-slate-800">{data.managementCompany}</dd>
              </>
            )}
          </dl>
        </section>
      ) : null}

      {data.buildings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">棟一覧</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.buildings.map((b) => (
              <li key={b.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-medium text-slate-900">
                  {b.canonicalName}
                  {b.buildingLabel && b.buildingLabel !== b.canonicalName
                    ? `（${b.buildingLabel}）`
                    : ''}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {b.floorsAbove ? `地上${b.floorsAbove}階` : ''}
                  {b.floorsBelow ? ` 地下${b.floorsBelow}階` : ''}
                  {b.totalUnits ? ` / 総戸数 ${b.totalUnits}戸` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8 rounded-xl bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">あなたのマンション、今いくら？</h2>
        <p className="mt-2 text-slate-600">
          マイマンションに登録すると、自宅の参考価格や相場をいつでも確認できます。
        </p>
        <Link
          href="/register"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
        >
          マイマンションに登録して、今の価格を確認
        </Link>
      </section>
    </main>
  );
}
