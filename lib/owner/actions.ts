'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser, isSupabaseConfigured } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/auth/supabase';
import type { AuthFormState, OwnerPropertyFormState } from '@/lib/owner/form-state';
import { insertOwnerProperty } from '@/lib/owner/queries';
import { parseCredentials, parseOwnerPropertyInput } from '@/lib/owner/validation';
import { getPublicMansion } from '@/lib/public/mansion';

const NOT_CONFIGURED_MESSAGE =
  '認証の設定が完了していないため、現在ログイン・登録をご利用いただけません。';

function registerPath(slug: string | null): string {
  return slug ? `/register?mansion=${encodeURIComponent(slug)}` : '/register';
}

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === 'string' ? value : null;
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { status: 'error', message: NOT_CONFIGURED_MESSAGE, errors: {} };
  }

  const parsed = parseCredentials({
    email: field(formData, 'email'),
    password: field(formData, 'password'),
  });
  if (!parsed.ok) {
    return { status: 'error', message: null, errors: parsed.errors };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) {
    // 認証エラーの詳細（アカウント有無など）は返さない
    return {
      status: 'error',
      message: 'メールアドレスまたはパスワードが正しくありません。',
      errors: {},
    };
  }

  revalidatePath(registerPath(field(formData, 'mansionSlug')));
  return { status: 'idle', message: null, errors: {} };
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { status: 'error', message: NOT_CONFIGURED_MESSAGE, errors: {} };
  }

  const parsed = parseCredentials({
    email: field(formData, 'email'),
    password: field(formData, 'password'),
  });
  if (!parsed.ok) {
    return { status: 'error', message: null, errors: parsed.errors };
  }

  const slug = field(formData, 'mansionSlug');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const next = registerPath(slug);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return {
      status: 'error',
      message: 'アカウントを作成できませんでした。しばらくしてからお試しください。',
      errors: {},
    };
  }

  // メール確認が有効な場合は session が発行されない
  if (!data.session) {
    return {
      status: 'confirmation_sent',
      message: '確認メールを送信しました。メール内のリンクから登録を完了してください。',
      errors: {},
    };
  }

  revalidatePath(next);
  return { status: 'idle', message: null, errors: {} };
}

export async function signOutAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath(registerPath(field(formData, 'mansionSlug')));
}

export async function registerOwnerPropertyAction(
  _prevState: OwnerPropertyFormState,
  formData: FormData,
): Promise<OwnerPropertyFormState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      status: 'error',
      message: 'ログインの有効期限が切れました。もう一度ログインしてください。',
      errors: {},
      registered: null,
    };
  }

  const slug = field(formData, 'mansionSlug');
  const mansion = slug ? await getPublicMansion(slug) : null;
  if (!mansion) {
    return {
      status: 'error',
      message: '対象のマンションが見つかりませんでした。',
      errors: {},
      registered: null,
    };
  }

  // mansion_id / building_id はクライアント入力ではなく公開データから解決する
  const parsed = parseOwnerPropertyInput(
    {
      mansionId: mansion.id,
      buildingId: field(formData, 'buildingId'),
      roomNumber: field(formData, 'roomNumber'),
      floor: field(formData, 'floor'),
      areaSqm: field(formData, 'areaSqm'),
      layout: field(formData, 'layout'),
      direction: field(formData, 'direction'),
    },
    mansion.buildings.map((b) => b.id),
  );
  if (!parsed.ok) {
    return { status: 'error', message: null, errors: parsed.errors, registered: null };
  }

  const result = await insertOwnerProperty(user.id, parsed.value);

  if (result.status === 'unavailable') {
    return {
      status: 'error',
      message: 'ただいま登録を受け付けられません。時間をおいて再度お試しください。',
      errors: {},
      registered: null,
    };
  }

  if (result.status === 'duplicate') {
    return {
      status: 'error',
      message: 'この部屋はすでに登録済みです。',
      errors: {},
      registered: null,
    };
  }

  const building = mansion.buildings.find((b) => b.id === result.property.buildingId) ?? null;

  revalidatePath(registerPath(slug));
  return {
    status: 'success',
    message: 'マイマンションを登録しました。',
    errors: {},
    registered: {
      mansionName: mansion.canonicalName,
      buildingName: building ? (building.buildingLabel ?? building.canonicalName) : null,
      roomNumber: result.property.roomNumber ?? parsed.value.roomNumber,
    },
  };
}
