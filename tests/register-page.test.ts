import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import RegisterPage from '@/app/register/page';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';
import { getPublicMansion } from '@/lib/public/mansion';

vi.mock('@/lib/public/mansion', () => ({
  getPublicMansion: vi.fn(),
}));

test('登録ページは非同期の検索パラメータから対象マンションを表示する', async () => {
  vi.mocked(getPublicMansion).mockResolvedValue(fixtureMansion);

  const page = await RegisterPage({
    searchParams: Promise.resolve({ mansion: fixtureMansion.slug }),
  });

  expect(getPublicMansion).toHaveBeenCalledWith(fixtureMansion.slug);
  expect(renderToStaticMarkup(page)).toContain(fixtureMansion.canonicalName);
});
