const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * canonical / OG URL の生成に使う絶対 URL。
 * Vercel では NEXT_PUBLIC_SITE_URL 未設定時に VERCEL_URL を使う。
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return DEFAULT_SITE_URL;
}
