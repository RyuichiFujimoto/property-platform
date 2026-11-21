import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { logWarn } from '@/lib/errors';
import { isReadOnlyCookieError } from '@/lib/auth/supabase';

// .env.local の有無でテスト結果が変わらないようにする。
vi.mock('dotenv', () => ({
  default: { config: () => ({ parsed: {} }) },
  config: () => ({ parsed: {} }),
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('getSql', () => {
  test('throws ConfigurationError when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    const { getSql } = await import('@/lib/db');
    // vi.resetModules() で class の同一性が失われるので name と message で検証する。
    expect(() => getSql()).toThrow(/DATABASE_URL is not set/);
    try {
      getSql();
      expect.unreachable('getSql should throw');
    } catch (error) {
      expect((error as Error).name).toBe('ConfigurationError');
    }
  });

  test('isDatabaseConfigured reports missing configuration without throwing', async () => {
    delete process.env.DATABASE_URL;
    const { isDatabaseConfigured } = await import('@/lib/db');
    expect(isDatabaseConfigured()).toBe(false);
  });
});

describe('getPublicMansion', () => {
  test('surfaces missing DB configuration instead of returning null', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.ALLOW_PREVIEW_DATA;
    delete process.env.VERCEL_ENV;
    const { getPublicMansion } = await import('@/lib/public/mansion');
    await expect(getPublicMansion('some-slug')).rejects.toThrow(/DATABASE_URL is not set/);
  });

  test('returns fixture data in preview mode', async () => {
    process.env.ALLOW_PREVIEW_DATA = 'true';
    const { getPublicMansion } = await import('@/lib/public/mansion');
    const data = await getPublicMansion('any-slug');
    expect(data?.slug).toBe('fixture-mansion');
  });
});

describe('isReadOnlyCookieError', () => {
  test('recognizes the Next.js read-only cookie error', () => {
    expect(
      isReadOnlyCookieError(
        new Error('Cookies can only be modified in a Server Action or Route Handler.')
      )
    ).toBe(true);
  });

  test('does not treat unrelated errors as read-only cookie errors', () => {
    expect(isReadOnlyCookieError(new Error('network unreachable'))).toBe(false);
    expect(isReadOnlyCookieError('boom')).toBe(false);
  });
});

describe('logWarn', () => {
  test('includes scope and context in the log line', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('public/mansion', 'dropped attribute', { slug: 'abc' });
    expect(warn).toHaveBeenCalledWith('[warn] public/mansion: dropped attribute slug=abc');
  });
});
