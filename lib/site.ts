import { isProductionDeployment } from '@/lib/deployment-env';
import { ConfigurationError, logWarn } from '@/lib/errors';

const FALLBACK_SITE_URL = 'http://localhost:3000';

function resolveConfiguredSiteUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit || isProductionDeployment()) return explicit;

  // Vercel のプレビュー環境では割り当てられたドメインを使う。
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return undefined;
}

/**
 * canonical / og:url / sitemap に使う絶対 URL のベース。
 * 本番では NEXT_PUBLIC_SITE_URL を必須とし、localhost にフォールバックしない。
 */
export function getSiteUrl(): string {
  const configured = resolveConfiguredSiteUrl();

  if (!configured) {
    if (isProductionDeployment()) {
      throw new ConfigurationError('NEXT_PUBLIC_SITE_URL is required in production');
    }
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(configured);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    // 無効な URL は以下で環境ごとに処理する。
  }

  if (isProductionDeployment()) {
    throw new ConfigurationError('NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL');
  }
  logWarn('site', 'NEXT_PUBLIC_SITE_URL is not a valid URL, falling back to localhost', {
    fallback: FALLBACK_SITE_URL,
  });
  return FALLBACK_SITE_URL;
}
