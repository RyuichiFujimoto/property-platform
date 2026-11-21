import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const getPublicMansionIndexEntries = vi.hoisted(() => vi.fn());

vi.mock('@/lib/public/mansion', () => ({ getPublicMansionIndexEntries }));

describe('sitemap / robots', () => {
  const envKeys = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_URL'] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    getPublicMansionIndexEntries.mockReset();
    for (const key of envKeys) savedEnv[key] = process.env[key];
    for (const key of envKeys) delete process.env[key];
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  test('sitemap は公開マンションの絶対 URL を返す', async () => {
    const updatedAt = new Date('2026-01-02T03:04:05Z');
    getPublicMansionIndexEntries.mockResolvedValue([
      { slug: 'park-tower-kachidoki-mid', updatedAt },
      { slug: 'sun-village', updatedAt: null },
    ]);
    const sitemap = (await import('@/app/sitemap')).default;

    await expect(sitemap()).resolves.toEqual([
      {
        url: 'https://example.com/mansion/park-tower-kachidoki-mid',
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: 'https://example.com/mansion/sun-village',
        lastModified: undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
    ]);
  });

  // 空の sitemap を返すと「公開ページが 0 件になった」と伝えてしまうので、失敗を伝播させる。
  test('sitemap は公開マンションの取得失敗を握り潰さない', async () => {
    getPublicMansionIndexEntries.mockRejectedValue(new Error('DATABASE_URL is not set.'));
    const sitemap = (await import('@/app/sitemap')).default;

    await expect(sitemap()).rejects.toThrow(/DATABASE_URL is not set/);
  });

  test('robots は管理画面を disallow し sitemap を宣言する', async () => {
    const robots = (await import('@/app/robots')).default;

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/mypage', '/api/'],
        },
      ],
      sitemap: 'https://example.com/sitemap.xml',
      host: 'https://example.com',
    });
  });
});
