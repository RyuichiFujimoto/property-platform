import { describe, expect, test } from 'vitest';
import { parseCredentials, parseOwnerPropertyInput } from '@/lib/owner/validation';

const BUILDINGS = ['BLD_A', 'BLD_B'];

function base(overrides: Record<string, string | null> = {}) {
  return { mansionId: 'MAN_1', roomNumber: '1203', ...overrides };
}

describe('parseOwnerPropertyInput', () => {
  test('必須項目のみで正規化された値を返す', () => {
    const result = parseOwnerPropertyInput(base());

    expect(result).toStrictEqual({
      ok: true,
      value: {
        mansionId: 'MAN_1',
        buildingId: null,
        roomNumber: '1203',
        floor: null,
        areaSqm: null,
        layout: null,
        direction: null,
      },
    });
  });

  test('全項目を数値・enum に変換する', () => {
    const result = parseOwnerPropertyInput(
      base({
        buildingId: 'BLD_B',
        floor: '12',
        areaSqm: '70.25',
        layout: ' 3LDK ',
        direction: '南東',
      }),
      BUILDINGS,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toStrictEqual({
      mansionId: 'MAN_1',
      buildingId: 'BLD_B',
      roomNumber: '1203',
      floor: 12,
      areaSqm: 70.25,
      layout: '3LDK',
      direction: '南東',
    });
  });

  test('空文字の任意項目は null として扱う', () => {
    const result = parseOwnerPropertyInput(
      base({ buildingId: '', floor: '  ', areaSqm: '', layout: '', direction: '' }),
      BUILDINGS,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.buildingId).toBeNull();
    expect(result.value.floor).toBeNull();
    expect(result.value.areaSqm).toBeNull();
    expect(result.value.layout).toBeNull();
    expect(result.value.direction).toBeNull();
  });

  test('部屋番号が未入力ならエラー', () => {
    const result = parseOwnerPropertyInput(base({ roomNumber: '  ' }));

    expect(result).toStrictEqual({
      ok: false,
      errors: { roomNumber: '部屋番号を入力してください' },
    });
  });

  test('部屋番号が長すぎるとエラー', () => {
    const result = parseOwnerPropertyInput(base({ roomNumber: 'a'.repeat(21) }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.roomNumber).toContain('20文字以内');
  });

  test('mansionId が空ならエラー', () => {
    const result = parseOwnerPropertyInput(base({ mansionId: '' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.mansionId).toBe('対象マンションが指定されていません');
  });

  test('対象マンションに存在しない棟はエラー（改ざんされた building_id を弾く）', () => {
    const result = parseOwnerPropertyInput(base({ buildingId: 'BLD_OTHER' }), BUILDINGS);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.buildingId).toBe('選択された棟が対象マンションに存在しません');
  });

  test.each([
    ['12.5', '階数は整数で入力してください'],
    ['abc', '階数は整数で入力してください'],
    ['0', '階数は-5〜200の範囲で入力してください'],
    ['201', '階数は-5〜200の範囲で入力してください'],
    ['-6', '階数は-5〜200の範囲で入力してください'],
  ])('不正な階数 %s はエラー', (floor, message) => {
    const result = parseOwnerPropertyInput(base({ floor }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.floor).toBe(message);
  });

  test('地下階は許容する', () => {
    const result = parseOwnerPropertyInput(base({ floor: '-1' }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.floor).toBe(-1);
  });

  test.each([
    ['abc', '専有面積は数値で入力してください'],
    ['4.9', '専有面積は5〜1000㎡の範囲で入力してください'],
    ['1001', '専有面積は5〜1000㎡の範囲で入力してください'],
  ])('不正な専有面積 %s はエラー', (areaSqm, message) => {
    const result = parseOwnerPropertyInput(base({ areaSqm }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.areaSqm).toBe(message);
  });

  test('間取りが長すぎるとエラー', () => {
    const result = parseOwnerPropertyInput(base({ layout: 'a'.repeat(21) }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.layout).toContain('20文字以内');
  });

  test('方角が選択肢外ならエラー', () => {
    const result = parseOwnerPropertyInput(base({ direction: '南南西' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.direction).toBe('方角の選択が不正です');
  });

  test('複数のエラーをまとめて返す', () => {
    const result = parseOwnerPropertyInput(base({ roomNumber: '', floor: 'x', direction: 'x' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toStrictEqual(['direction', 'floor', 'roomNumber']);
  });
});

describe('parseCredentials', () => {
  test('メールアドレスを小文字化して返す', () => {
    const result = parseCredentials({ email: '  Owner@Example.COM ', password: 'password1' });

    expect(result).toStrictEqual({
      ok: true,
      value: { email: 'owner@example.com', password: 'password1' },
    });
  });

  test('メールアドレス未入力はエラー', () => {
    const result = parseCredentials({ email: '', password: 'password1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.email).toBe('メールアドレスを入力してください');
  });

  test.each(['owner', 'owner@example', 'owner example@test.com'])(
    '形式が不正なメールアドレス %s はエラー',
    (email) => {
      const result = parseCredentials({ email, password: 'password1' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.email).toBe('メールアドレスの形式が正しくありません');
    },
  );

  test('パスワード未入力はエラー', () => {
    const result = parseCredentials({ email: 'owner@example.com', password: '' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.password).toBe('パスワードを入力してください');
  });

  test('パスワードが短いとエラー', () => {
    const result = parseCredentials({ email: 'owner@example.com', password: '1234567' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.password).toContain('8文字以上');
  });

  test('未指定（undefined）でもエラーを返す', () => {
    const result = parseCredentials({});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toStrictEqual({
      email: 'メールアドレスを入力してください',
      password: 'パスワードを入力してください',
    });
  });
});
