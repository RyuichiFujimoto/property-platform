import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/auth/env';

/**
 * Client Component 用のクライアント。
 * session を cookie に保存するため、server 側からも同じ session を参照できる。
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
