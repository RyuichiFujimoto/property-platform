import type { MetadataRoute } from 'next';
import { getPublicMansionIndexEntries } from '@/lib/public/mansion';
import { getSiteUrl } from '@/lib/site';

/**
 * 公開マンションは運用中に増減するので、ビルド時に固定せず都度生成する。
 * DB が読めない場合は空の sitemap を返すのではなくエラーにする。
 * 空を返すと「公開ページが 0 件になった」と検索エンジンに伝えてしまう。
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const entries = await getPublicMansionIndexEntries();

  return entries.map((entry) => ({
    url: `${siteUrl}/mansion/${entry.slug}`,
    lastModified: entry.updatedAt ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}
