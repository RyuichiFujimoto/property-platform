import type { SetAllCookies } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, expect, test, vi } from 'vitest';
import { middleware } from '../middleware';

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/ssr', () => ({ createServerClient }));

afterEach(() => {
  createServerClient.mockReset();
  vi.unstubAllEnvs();
});

test('does not start authentication when Supabase is not configured', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);

  await middleware(new NextRequest('https://example.com/admin'));

  expect(createServerClient).not.toHaveBeenCalled();
});

test('forwards refreshed cookies and cache protection to the response', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  createServerClient.mockImplementation(
    (_url: string, _key: string, { cookies }: { cookies: { setAll: SetAllCookies } }) => ({
      auth: {
        getUser: async () => {
          await cookies.setAll(
            [{ name: 'session', value: 'refreshed', options: { path: '/' } }],
            { 'Cache-Control': 'private, no-store' },
          );
        },
      },
    }),
  );

  const request = new NextRequest('https://example.com/register');
  const response = await middleware(request);

  expect(request.cookies.get('session')?.value).toBe('refreshed');
  expect(response.cookies.get('session')).toMatchObject({ value: 'refreshed', path: '/' });
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
