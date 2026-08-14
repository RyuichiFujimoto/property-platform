import type { MetadataRoute } from 'next';
import { getPublishedMansionSlugs } from '@/lib/public/mansion';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const slugs = await getPublishedMansionSlugs();

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    ...slugs.map((slug) => ({
      url: `${base}/mansion/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
