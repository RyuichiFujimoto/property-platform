import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ConfigurationError, logWarn } from '@/lib/errors';

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new ConfigurationError('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new ConfigurationError('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ConfigurationError('SUPABASE_SERVICE_ROLE_KEY is not set');
  return key;
}

/**
 * Next.js は Server Component のレンダリング中の cookie 書き込みを拒否する。
 * そのケースだけを安全に無視するための判定。
 */
export function isReadOnlyCookieError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /can only be modified in a Server Action|read-only/i.test(error.message);
}

export async function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          // Server Component のレンダリング中は cookie が read-only なので、この場合のみ無視する。
          // それ以外のエラーを握り潰すと、セッション更新の失敗に気付けなくなる。
          if (!isReadOnlyCookieError(error)) throw error;
          logWarn('auth/supabase', 'cookies are read-only in this context, skipping session write');
        }
      },
    },
  });
}

export function createServiceRoleClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createBrowserSupabaseClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey());
}
