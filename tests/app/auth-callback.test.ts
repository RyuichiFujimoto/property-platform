import { NextRequest } from 'next/server';
import { beforeEach, expect, test, vi } from 'vitest';
import { GET } from '@/app/auth/callback/route';

const exchangeCodeForSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/env', () => ({ isSupabaseConfigured: () => true }));
vi.mock('@/lib/auth/supabase-server', () => ({
  createServerSupabaseClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

beforeEach(() => {
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
});

function callback(next: string) {
  const query = new URLSearchParams({ code: 'test-code', next });
  return GET(new NextRequest(`https://example.com/auth/callback?${query}`));
}

test('exchanges the confirmation code and preserves the selected property', async () => {
  const response = await callback('/register?mansion=example');

  expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  expect(response.headers.get('location')).toBe('https://example.com/register?mansion=example');
});

test.each(['//other.example', '/\\other.example', '/\t/other.example'])(
  'does not redirect outside the site for %j',
  async (next) => {
    const response = await callback(next);
    expect(response.headers.get('location')).toBe('https://example.com/register');
  }
);

test('redirects to the registration error state if confirmation fails', async () => {
  exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid code') });
  const response = await callback('/register');

  expect(response.headers.get('location')).toBe('https://example.com/register?auth_error=1');
});
