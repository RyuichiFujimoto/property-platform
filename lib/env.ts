/**
 * NEXT_PUBLIC_* は Next のビルド時インライン化のため `process.env.X` を静的に参照する必要があるため、
 * 値そのものを受け取って検証する。
 */
export function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function isPreviewMode(): boolean {
  return (
    process.env.ALLOW_PREVIEW_DATA === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'development'
  );
}
