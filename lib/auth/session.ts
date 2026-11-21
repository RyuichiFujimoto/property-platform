import { isSupabaseConfigured } from '@/lib/auth/env';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}
