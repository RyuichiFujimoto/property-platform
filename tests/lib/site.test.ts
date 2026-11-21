import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSiteUrl } from '@/lib/site';

describe('getSiteUrl', () => {
  const envKeys = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VERCEL_ENV', undefined);
    for (const key of envKeys) savedEnv[key] = process.env[key];
    for (const key of envKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('本番では NEXT_PUBLIC_SITE_URL の origin を優先する', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
    process.env.VERCEL_URL = 'deployment.vercel.app';

    expect(getSiteUrl()).toBe('https://example.com');
  });

  test('プレビューでは NEXT_PUBLIC_SITE_URL が無い場合は VERCEL_URL を使う', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    process.env.VERCEL_URL = 'preview-abc.vercel.app';

    expect(getSiteUrl()).toBe('https://preview-abc.vercel.app');
  });

  test.each(['production', undefined])('本番 (VERCEL_ENV=%s) で未設定の場合は例外を投げる', (vercelEnv) => {
    vi.stubEnv('NODE_ENV', vercelEnv ? 'test' : 'production');
    vi.stubEnv('VERCEL_ENV', vercelEnv);
    process.env.VERCEL_URL = 'deployment.vercel.app';

    expect(getSiteUrl).toThrow('NEXT_PUBLIC_SITE_URL is required in production');
  });

  test.each(['not-a-url', 'file:///site'])('本番で URL が不正 (%s) の場合は例外を投げる', (value) => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = value;

    expect(getSiteUrl).toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL');
  });

  test('URL として不正な値は localhost に fallback する', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not-a-url';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getSiteUrl()).toBe('http://localhost:3000');
    expect(warn).toHaveBeenCalled();
  });
});
