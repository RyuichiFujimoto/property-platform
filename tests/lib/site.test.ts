import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getSiteUrl } from '@/lib/site';

describe('getSiteUrl', () => {
  const envKeys = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
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

  test('NEXT_PUBLIC_SITE_URL の origin を返す', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';

    expect(getSiteUrl()).toBe('https://example.com');
  });

  test('NEXT_PUBLIC_SITE_URL が無い場合は VERCEL_URL を使う', () => {
    process.env.VERCEL_URL = 'preview-abc.vercel.app';

    expect(getSiteUrl()).toBe('https://preview-abc.vercel.app');
  });

  test('本番で未設定の場合は localhost に fallback し、警告を残す', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getSiteUrl()).toBe('http://localhost:3000');
    expect(warn).toHaveBeenCalled();
  });

  test('URL として不正な値は localhost に fallback する', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not-a-url';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getSiteUrl()).toBe('http://localhost:3000');
    expect(warn).toHaveBeenCalled();
  });
});
