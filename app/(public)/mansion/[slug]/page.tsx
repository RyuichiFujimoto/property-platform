import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicMansion } from '@/lib/public/mansion';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicMansion(params.slug);

  if (!data) {
    return {
      title: 'マンションが見つかりません',
      robots: { index: false },
    };
  }

  const title = data.canonicalName;
  const description = data.address
    ? `${data.address}のマンション情報。${data.nearestStation ?? ''}`
    : `${data.canonicalName}のマンション情報`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/mansion/${data.slug}`,
      type: 'website',
    },
    alternates: {
      canonical: `/mansion/${data.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    // プレビューの fixture は架空データなので index させない。
    robots: {
      index: !data.isPreview,
      follow: true,
    },
  };
}

export default async function MansionDetailPage({ params }: Props) {
  const data = await getPublicMansion(params.slug);

  if (!data) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: data.canonicalName,
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
      '@type': 'Apartment',
      name: b.canonicalName,
      numberOfRooms: b.totalUnits ?? undefined,
      floorSize: b.floorsAbove ?? undefined,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{data.canonicalName}</h1>
        {data.address && <p className="mt-2 text-slate-600">{data.address}</p>}
        {data.nearestStation && (
          <p className="mt-1 text-slate-500">最寄駅：{data.nearestStation}</p>
        )}
        {(data.builtYear || data.totalUnits) && (
          <p className="mt-2 text-sm text-slate-500">
            {data.builtYear ? `竣工：${data.builtYear}年` : ''}
            {data.builtYear && data.totalUnits ? ' / ' : ''}
            {data.totalUnits ? `総戸数：${data.totalUnits}戸` : ''}
          </p>
        )}
      </section>

      {data.structure || data.developer ? (
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
            {data.constructor && (
              <>
                <dt className="text-slate-500">施工会社</dt>
                <dd className="text-slate-800">{data.constructor}</dd>
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
                  {b.buildingLabel ? `（${b.buildingLabel}）` : ''}
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
        <a
          href={`/register?mansion=${encodeURIComponent(data.slug)}`}
          className="mt-4 inline-block rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
        >
          マイマンションに登録して、今の価格を確認
        </a>
      </section>
    </main>
  );
}
