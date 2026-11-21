import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/auth/env';
import { requireEnv } from '@/lib/env';
import { logWarn } from '@/lib/errors';

export function getSupabaseServiceRoleKey(): string {
  return requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Next.js は Server Component のレンダリング中の cookie 書き込みを拒否する。
 * そのケースだけを安全に無視するための判定。
 */
export function isReadOnlyCookieError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /can only be modified in a Server Action|read-only/i.test(error.message);
}

/**
 * Server Component / Server Action / Route Handler 用のクライアント。
 * session は cookie 経由で読み書きする。
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

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

/**
 * RLS を迂回する管理用クライアント。service role key を扱うため server 限定。
 */
export function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
