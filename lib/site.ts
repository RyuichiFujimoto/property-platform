import { logWarn } from '@/lib/errors';

const FALLBACK_SITE_URL = 'http://localhost:3000';

function resolveConfiguredSiteUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;

  // Vercel のプレビュー環境では割り当てられたドメインを使う。
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return undefined;
}

/**
 * canonical / og:url / sitemap に使う絶対 URL のベース。
 * 未設定のまま本番に出ると canonical が localhost を指すので、警告を残して検知できるようにする。
 */
export function getSiteUrl(): string {
  const configured = resolveConfiguredSiteUrl();

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      logWarn('site', 'NEXT_PUBLIC_SITE_URL is not set, falling back to localhost', {
        fallback: FALLBACK_SITE_URL,
      });
    }
    return FALLBACK_SITE_URL;
  }

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    logWarn('site', 'NEXT_PUBLIC_SITE_URL is not a valid URL, falling back to localhost', {
      value: configured,
      fallback: FALLBACK_SITE_URL,
    });
    return FALLBACK_SITE_URL;
  }
}
