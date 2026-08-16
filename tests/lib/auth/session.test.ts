import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/supabase', () => ({ createServerSupabaseClient }));

function mockGetUser(result: unknown) {
  createServerSupabaseClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue(result) },
  });
}

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isSupabaseConfigured', () => {
  test('URL と anon key が揃っていれば true', async () => {
    const { isSupabaseConfigured } = await import('@/lib/auth/session');

    expect(isSupabaseConfigured()).toBe(true);
  });

  test.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])(
    '%s が無ければ false',
    async (key) => {
      vi.stubEnv(key, '');
      const { isSupabaseConfigured } = await import('@/lib/auth/session');

      expect(isSupabaseConfigured()).toBe(false);
    },
  );
});

describe('getSessionUser', () => {
  test('未設定環境では Supabase を呼ばずに null を返す', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const { getSessionUser } = await import('@/lib/auth/session');

    await expect(getSessionUser()).resolves.toBeNull();
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  test('ログイン済みなら id と email を返す', async () => {
    mockGetUser({ data: { user: { id: 'user-1', email: 'owner@example.com' } }, error: null });
    const { getSessionUser } = await import('@/lib/auth/session');

    await expect(getSessionUser()).resolves.toStrictEqual({
      id: 'user-1',
      email: 'owner@example.com',
    });
  });

  test('email を持たないユーザーは email を null にする', async () => {
    mockGetUser({ data: { user: { id: 'user-1' } }, error: null });
    const { getSessionUser } = await import('@/lib/auth/session');

    await expect(getSessionUser()).resolves.toStrictEqual({ id: 'user-1', email: null });
  });

  test('未ログインなら null を返す', async () => {
    mockGetUser({ data: { user: null }, error: null });
    const { getSessionUser } = await import('@/lib/auth/session');

    await expect(getSessionUser()).resolves.toBeNull();
  });

  test('Supabase がエラーを返した場合も null を返す', async () => {
    mockGetUser({ data: { user: { id: 'user-1' } }, error: { message: 'invalid token' } });
    const { getSessionUser } = await import('@/lib/auth/session');

    await expect(getSessionUser()).resolves.toBeNull();
  });
});
