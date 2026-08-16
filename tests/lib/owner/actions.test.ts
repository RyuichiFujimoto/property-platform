import { beforeEach, describe, expect, test, vi } from 'vitest';
import { initialAuthFormState, initialOwnerPropertyFormState } from '@/lib/owner/form-state';
import type { PublicMansion } from '@/lib/public/mansion';

const revalidatePath = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());
const getSessionUser = vi.hoisted(() => vi.fn());
const isSupabaseConfigured = vi.hoisted(() => vi.fn());
const insertOwnerProperty = vi.hoisted(() => vi.fn());
const getPublicMansion = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/auth/supabase', () => ({ createServerSupabaseClient }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser, isSupabaseConfigured }));
vi.mock('@/lib/owner/queries', () => ({ insertOwnerProperty }));
vi.mock('@/lib/public/mansion', () => ({ getPublicMansion }));

const MANSION: PublicMansion = {
  id: 'MAN_1',
  publicId: 'MAN_1',
  slug: 'fixture-mansion',
  canonicalName: 'テストマンション',
  address: null,
  ward: null,
  town: null,
  builtYear: null,
  builtMonth: null,
  totalUnits: null,
  developer: null,
  constructor: null,
  managementCompany: null,
  structure: null,
  mansionType: null,
  nearestStation: null,
  buildings: [
    {
      id: 'BLD_1',
      canonicalName: 'テストマンション',
      buildingLabel: 'A棟',
      floorsAbove: null,
      floorsBelow: null,
      totalUnits: null,
      structure: null,
      builtYear: null,
      builtMonth: null,
    },
  ],
};

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

function mockAuth(overrides: Record<string, unknown>) {
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  createServerSupabaseClient.mockResolvedValue({ auth });
  return auth;
}

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfigured.mockReturnValue(true);
});

describe('signInAction', () => {
  test('Supabase 未設定なら準備中メッセージを返す', async () => {
    isSupabaseConfigured.mockReturnValue(false);
    const { signInAction } = await import('@/lib/owner/actions');

    const state = await signInAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1' }),
    );

    expect(state.status).toBe('error');
    expect(state.message).toContain('認証の設定が完了していない');
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  test('入力不備は Supabase を呼ばずフィールドエラーを返す', async () => {
    const { signInAction } = await import('@/lib/owner/actions');

    const state = await signInAction(initialAuthFormState, formData({ email: 'x', password: '' }));

    expect(state.errors).toStrictEqual({
      email: 'メールアドレスの形式が正しくありません',
      password: 'パスワードを入力してください',
    });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  test('認証成功で register ページを再検証する', async () => {
    const auth = mockAuth({});
    const { signInAction } = await import('@/lib/owner/actions');

    const state = await signInAction(
      initialAuthFormState,
      formData({ email: 'Owner@example.com', password: 'password1', mansionSlug: 'fixture' }),
    );

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'password1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/register?mansion=fixture');
    expect(state).toStrictEqual(initialAuthFormState);
  });

  test('認証失敗ではアカウントの有無を明かさない', async () => {
    mockAuth({
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid' } }),
    });
    const { signInAction } = await import('@/lib/owner/actions');

    const state = await signInAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1' }),
    );

    expect(state.message).toBe('メールアドレスまたはパスワードが正しくありません。');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('signUpAction', () => {
  test('session が返ればそのままログイン状態にする', async () => {
    const auth = mockAuth({});
    const { signUpAction } = await import('@/lib/owner/actions');

    const state = await signUpAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1', mansionSlug: 'fixture' }),
    );

    expect(state.status).toBe('idle');
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@example.com', password: 'password1' }),
    );
    const options = auth.signUp.mock.calls[0][0].options as { emailRedirectTo: string };
    expect(options.emailRedirectTo).toContain(
      `/auth/callback?next=${encodeURIComponent('/register?mansion=fixture')}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/register?mansion=fixture');
  });

  test('メール確認が必要な場合は確認メール送信を伝える', async () => {
    mockAuth({ signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) });
    const { signUpAction } = await import('@/lib/owner/actions');

    const state = await signUpAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1' }),
    );

    expect(state.status).toBe('confirmation_sent');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('Supabase エラーは汎用メッセージで返す', async () => {
    mockAuth({
      signUp: vi.fn().mockResolvedValue({ data: {}, error: { message: 'rate limited' } }),
    });
    const { signUpAction } = await import('@/lib/owner/actions');

    const state = await signUpAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1' }),
    );

    expect(state).toStrictEqual({
      status: 'error',
      message: 'アカウントを作成できませんでした。しばらくしてからお試しください。',
      errors: {},
    });
  });

  test('入力不備は Supabase を呼ばない', async () => {
    const { signUpAction } = await import('@/lib/owner/actions');

    const state = await signUpAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'short' }),
    );

    expect(state.errors.password).toContain('8文字以上');
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  test('Supabase 未設定なら準備中メッセージを返す', async () => {
    isSupabaseConfigured.mockReturnValue(false);
    const { signUpAction } = await import('@/lib/owner/actions');

    const state = await signUpAction(
      initialAuthFormState,
      formData({ email: 'owner@example.com', password: 'password1' }),
    );

    expect(state.status).toBe('error');
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });
});

describe('signOutAction', () => {
  test('サインアウトして register ページを再検証する', async () => {
    const auth = mockAuth({});
    const { signOutAction } = await import('@/lib/owner/actions');

    await signOutAction(formData({ mansionSlug: 'fixture-mansion' }));

    expect(auth.signOut).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/register?mansion=fixture-mansion');
  });

  test('mansionSlug が無ければ /register を再検証する', async () => {
    mockAuth({});
    const { signOutAction } = await import('@/lib/owner/actions');

    await signOutAction(formData({}));

    expect(revalidatePath).toHaveBeenCalledWith('/register');
  });

  test('Supabase 未設定なら何もしない', async () => {
    isSupabaseConfigured.mockReturnValue(false);
    const { signOutAction } = await import('@/lib/owner/actions');

    await signOutAction(formData({}));

    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('registerOwnerPropertyAction', () => {
  const validForm = {
    mansionSlug: 'fixture-mansion',
    buildingId: 'BLD_1',
    roomNumber: '1203',
    floor: '12',
    areaSqm: '70.25',
    layout: '3LDK',
    direction: '南東',
  };

  test('未ログインなら再ログインを促し DB へ書き込まない', async () => {
    getSessionUser.mockResolvedValue(null);
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData(validForm),
    );

    expect(state.status).toBe('error');
    expect(state.message).toContain('もう一度ログイン');
    expect(insertOwnerProperty).not.toHaveBeenCalled();
  });

  test('公開マンションが見つからなければエラー', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' });
    getPublicMansion.mockResolvedValue(null);
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData(validForm),
    );

    expect(state.message).toBe('対象のマンションが見つかりませんでした。');
    expect(insertOwnerProperty).not.toHaveBeenCalled();
  });

  test('mansion slug が無ければ公開データを引かずエラー', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: null });
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData({ roomNumber: '1203' }),
    );

    expect(state.status).toBe('error');
    expect(getPublicMansion).not.toHaveBeenCalled();
  });

  test('mansion_id はクライアント入力ではなく公開データから解決する', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' });
    getPublicMansion.mockResolvedValue(MANSION);
    insertOwnerProperty.mockResolvedValue({
      status: 'created',
      property: {
        id: 'OWP_1',
        mansionId: 'MAN_1',
        buildingId: 'BLD_1',
        roomNumber: '1203',
        floor: 12,
        areaSqm: 70.25,
        layout: '3LDK',
        direction: '南東',
        registeredAt: null,
      },
    });
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData({ ...validForm, mansionId: 'MAN_ATTACKER' }),
    );

    expect(insertOwnerProperty).toHaveBeenCalledWith('user-1', {
      mansionId: 'MAN_1',
      buildingId: 'BLD_1',
      roomNumber: '1203',
      floor: 12,
      areaSqm: 70.25,
      layout: '3LDK',
      direction: '南東',
    });
    expect(state.status).toBe('success');
    expect(state.registered).toStrictEqual({
      mansionName: 'テストマンション',
      buildingName: 'A棟',
      roomNumber: '1203',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/register?mansion=fixture-mansion');
  });

  test('対象マンションに無い棟は保存しない', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: null });
    getPublicMansion.mockResolvedValue(MANSION);
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData({ ...validForm, buildingId: 'BLD_OTHER' }),
    );

    expect(state.errors.buildingId).toBeDefined();
    expect(insertOwnerProperty).not.toHaveBeenCalled();
  });

  test('DB 未接続なら受付できないことを伝える', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: null });
    getPublicMansion.mockResolvedValue(MANSION);
    insertOwnerProperty.mockResolvedValue({ status: 'unavailable' });
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData(validForm),
    );

    expect(state.message).toContain('登録を受け付けられません');
    expect(state.registered).toBeNull();
  });

  test('同じ部屋の二重登録は重複として伝える', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: null });
    getPublicMansion.mockResolvedValue(MANSION);
    insertOwnerProperty.mockResolvedValue({ status: 'duplicate' });
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData(validForm),
    );

    expect(state.message).toBe('この部屋はすでに登録済みです。');
  });

  test('棟を選ばない場合は buildingName が null になる', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', email: null });
    getPublicMansion.mockResolvedValue(MANSION);
    insertOwnerProperty.mockResolvedValue({
      status: 'created',
      property: {
        id: 'OWP_2',
        mansionId: 'MAN_1',
        buildingId: null,
        roomNumber: '801',
        floor: null,
        areaSqm: null,
        layout: null,
        direction: null,
        registeredAt: null,
      },
    });
    const { registerOwnerPropertyAction } = await import('@/lib/owner/actions');

    const state = await registerOwnerPropertyAction(
      initialOwnerPropertyFormState,
      formData({ mansionSlug: 'fixture-mansion', roomNumber: '801' }),
    );

    expect(state.registered).toStrictEqual({
      mansionName: 'テストマンション',
      buildingName: null,
      roomNumber: '801',
    });
  });
});
