import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/auth/supabase';

/**
 * Supabase のメール確認リンクから戻ってきた code を session に交換する。
 * オープンリダイレクトを避けるため、next は同一オリジンの path のみ許可する。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/register';

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/register?auth_error=1', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
