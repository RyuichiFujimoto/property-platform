import type { MetadataRoute } from 'next';
import { isPreviewMode } from '@/lib/public/mansion';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (isPreviewMode()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
