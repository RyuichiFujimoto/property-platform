import { afterEach, describe, expect, test, vi } from 'vitest';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

async function loadModule() {
  return import('@/lib/public/mansion');
}

describe('isPreviewMode', () => {
  test('production では ALLOW_PREVIEW_DATA が true でも架空データを許可しない', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.ALLOW_PREVIEW_DATA = 'true';
    const { isPreviewMode } = await loadModule();
    expect(isPreviewMode()).toBe(false);
  });

  test('preview 環境では許可する', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { isPreviewMode } = await loadModule();
    expect(isPreviewMode()).toBe(true);
  });
});

describe('getPublicMansion', () => {
  test('preview では fixture の slug のみ fixture を返す', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { getPublicMansion } = await loadModule();
    await expect(getPublicMansion(fixtureMansion.slug)).resolves.toEqual(fixtureMansion);
  });

  test('preview でも未知の slug は fixture を返さない', async () => {
    process.env.VERCEL_ENV = 'preview';
    delete process.env.DATABASE_URL;
    const { getPublicMansion } = await loadModule();
    await expect(getPublicMansion('unknown-slug')).rejects.toThrow(/DATABASE_URL/);
  });
});

describe('toNum', () => {
  test('数値以外や空文字は null になる', async () => {
    const { toNum } = await loadModule();
    expect(toNum('42')).toBe(42);
    expect(toNum('')).toBe(null);
    expect(toNum(null)).toBe(null);
    expect(toNum('abc')).toBe(null);
    expect(toNum('Infinity')).toBe(null);
  });
});
