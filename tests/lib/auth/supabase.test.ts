import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const createServerClient = vi.hoisted(() =>
  vi.fn((_url: string, _key: string, _options: unknown) => ({ tag: 'server-client' })),
);
const createSupabaseClient = vi.hoisted(() =>
  vi.fn((_url: string, _key: string, _options?: unknown) => ({ tag: 'supabase-client' })),
);
const cookies = vi.hoisted(() => vi.fn());

vi.mock('@supabase/ssr', () => ({ createServerClient }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createSupabaseClient }));
vi.mock('next/headers', () => ({ cookies }));

const envKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

describe('lib/auth/supabase', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) savedEnv[key] = process.env[key];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    createServerClient.mockClear();
    createSupabaseClient.mockClear();
    cookies.mockReset();
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  test('環境変数から URL と key を読み出す', async () => {
    const { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } = await import(
      '@/lib/auth/supabase'
    );

    expect(getSupabaseUrl()).toBe('https://project.supabase.co');
    expect(getSupabaseAnonKey()).toBe('anon-key');
    expect(getSupabaseServiceRoleKey()).toBe('service-role-key');
  });

  test('環境変数が未設定の場合は変数名を含めて throw する', async () => {
    const { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } = await import(
      '@/lib/auth/supabase'
    );
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(getSupabaseUrl).toThrow('NEXT_PUBLIC_SUPABASE_URL is not set');
    expect(getSupabaseAnonKey).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    expect(getSupabaseServiceRoleKey).toThrow('SUPABASE_SERVICE_ROLE_KEY is not set');
  });

  test('createServerSupabaseClient は cookie store を読み書きする', async () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: 'sb', value: 'v' }]),
      set: vi.fn(),
    };
    cookies.mockReturnValue(cookieStore);
    const { createServerSupabaseClient } = await import('@/lib/auth/supabase');

    const client = await createServerSupabaseClient();

    expect(client).toEqual({ tag: 'server-client' });
    expect(createServerClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-key',
      expect.anything(),
    );

    const options = createServerClient.mock.calls[0][2] as {
      cookies: {
        getAll: () => unknown;
        setAll: (c: { name: string; value: string; options: unknown }[]) => void;
      };
    };
    expect(options.cookies.getAll()).toEqual([{ name: 'sb', value: 'v' }]);

    options.cookies.setAll([{ name: 'a', value: '1', options: { path: '/' } }]);
    expect(cookieStore.set).toHaveBeenCalledWith('a', '1', { path: '/' });
  });

  test('Server Component で cookie を設定できない場合も setAll は throw しない', async () => {
    const cookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cookies can only be modified in a Server Action');
      }),
    };
    cookies.mockReturnValue(cookieStore);
    const { createServerSupabaseClient } = await import('@/lib/auth/supabase');
    await createServerSupabaseClient();

    const options = createServerClient.mock.calls[0][2] as {
      cookies: { setAll: (c: { name: string; value: string; options: unknown }[]) => void };
    };

    expect(() =>
      options.cookies.setAll([{ name: 'a', value: '1', options: {} }]),
    ).not.toThrow();
  });

  test('createServiceRoleClient は service role key と session 無効化オプションを使う', async () => {
    const { createServiceRoleClient } = await import('@/lib/auth/supabase');

    expect(createServiceRoleClient()).toEqual({ tag: 'supabase-client' });
    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  test('createBrowserSupabaseClient は anon key を使う', async () => {
    const { createBrowserSupabaseClient } = await import('@/lib/auth/supabase');

    expect(createBrowserSupabaseClient()).toEqual({ tag: 'supabase-client' });
    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'anon-key',
    );
  });
});
