import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/auth/supabase';

export const dynamic = 'force-dynamic';

// 管理画面は ADMIN_EMAILS に列挙されたログイン済みユーザーのみアクセスできる。
// 未設定の場合は誰も入れない（fail closed）。
function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

async function getCurrentUserEmail(): Promise<string | undefined> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email;
  } catch {
    // Supabase の環境変数が未設定なら認証できない = アクセスさせない
    return undefined;
  }
}

export default async function AdminPage() {
  if (!isAdminEmail(await getCurrentUserEmail())) {
    notFound();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">管理画面</h1>
      <p className="mt-4 text-slate-600">管理ツールのプレースホルダーです。</p>
    </main>
  );
}
