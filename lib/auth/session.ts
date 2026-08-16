import { createServerSupabaseClient } from '@/lib/auth/supabase';

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Supabase の公開設定が揃っているか。
 * 認証情報が無い環境（CI / ローカル / preview）でもページを 500 にせず、
 * 「準備中」表示へフォールバックするための判定に使う。
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
