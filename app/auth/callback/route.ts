import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/auth/env';
import { createServerSupabaseClient } from '@/lib/auth/supabase-server';

function resolveNext(rawNext: string | null, origin: string): URL {
  if (rawNext?.startsWith('/') && !rawNext.startsWith('//') && URL.canParse(rawNext, origin)) {
    const target = new URL(rawNext, origin);
    if (target.origin === origin && !target.username && !target.password) return target;
  }
  return new URL('/register', origin);
}

/**
 * Supabase のメール確認リンクから戻ってきた code を session に交換する。
 * オープンリダイレクトを避けるため、next は同一オリジンの path のみ許可する。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = resolveNext(searchParams.get('next'), origin);

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(next);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/register?auth_error=1', origin));
  }

  return NextResponse.redirect(next);
}
