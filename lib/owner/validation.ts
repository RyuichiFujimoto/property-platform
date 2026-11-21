export const UNIT_DIRECTIONS = [
  '南',
  '南東',
  '南西',
  '東',
  '西',
  '北',
  '北東',
  '北西',
] as const;

export type UnitDirection = (typeof UNIT_DIRECTIONS)[number];

export interface OwnerPropertyInput {
  mansionId: string;
  buildingId: string | null;
  roomNumber: string;
  floor: number | null;
  areaSqm: number | null;
  layout: string | null;
  direction: UnitDirection | null;
}

export type OwnerPropertyField = keyof OwnerPropertyInput;

export type OwnerPropertyFieldErrors = Partial<Record<OwnerPropertyField, string>>;

export interface RawOwnerPropertyInput {
  mansionId?: string | null;
  buildingId?: string | null;
  roomNumber?: string | null;
  floor?: string | null;
  areaSqm?: string | null;
  layout?: string | null;
  direction?: string | null;
}

export type OwnerPropertyParseResult =
  | { ok: true; value: OwnerPropertyInput }
  | { ok: false; errors: OwnerPropertyFieldErrors };

const ROOM_NUMBER_MAX_LENGTH = 20;
const LAYOUT_MAX_LENGTH = 20;
const FLOOR_MIN = -5;
const FLOOR_MAX = 200;
const AREA_MIN = 5;
const AREA_MAX = 1000;

function trimmed(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function optional(value: string | null | undefined): string | null {
  const t = trimmed(value);
  return t === '' ? null : t;
}

export function parseOwnerPropertyInput(
  raw: RawOwnerPropertyInput,
  allowedBuildingIds: readonly string[] = [],
): OwnerPropertyParseResult {
  const errors: OwnerPropertyFieldErrors = {};

  const mansionId = trimmed(raw.mansionId);
  if (mansionId === '') {
    errors.mansionId = '対象マンションが指定されていません';
  }

  const buildingId = optional(raw.buildingId);
  if (buildingId !== null && !allowedBuildingIds.includes(buildingId)) {
    errors.buildingId = '選択された棟が対象マンションに存在しません';
  }

  const roomNumber = trimmed(raw.roomNumber);
  if (roomNumber === '') {
    errors.roomNumber = '部屋番号を入力してください';
  } else if (roomNumber.length > ROOM_NUMBER_MAX_LENGTH) {
    errors.roomNumber = `部屋番号は${ROOM_NUMBER_MAX_LENGTH}文字以内で入力してください`;
  }

  let floor: number | null = null;
  const rawFloor = optional(raw.floor);
  if (rawFloor !== null) {
    const n = Number(rawFloor);
    if (!Number.isInteger(n)) {
      errors.floor = '階数は整数で入力してください';
    } else if (n < FLOOR_MIN || n > FLOOR_MAX || n === 0) {
      errors.floor = `階数は${FLOOR_MIN}〜${FLOOR_MAX}の範囲で入力してください`;
    } else {
      floor = n;
    }
  }

  let areaSqm: number | null = null;
  const rawArea = optional(raw.areaSqm);
  if (rawArea !== null) {
    const n = Number(rawArea);
    if (Number.isNaN(n)) {
      errors.areaSqm = '専有面積は数値で入力してください';
    } else if (n < AREA_MIN || n > AREA_MAX) {
      errors.areaSqm = `専有面積は${AREA_MIN}〜${AREA_MAX}㎡の範囲で入力してください`;
    } else {
      areaSqm = n;
    }
  }

  const layout = optional(raw.layout);
  if (layout !== null && layout.length > LAYOUT_MAX_LENGTH) {
    errors.layout = `間取りは${LAYOUT_MAX_LENGTH}文字以内で入力してください`;
  }

  const rawDirection = optional(raw.direction);
  let direction: UnitDirection | null = null;
  if (rawDirection !== null) {
    const match = UNIT_DIRECTIONS.find((d) => d === rawDirection);
    if (!match) {
      errors.direction = '方角の選択が不正です';
    } else {
      direction = match;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      mansionId,
      buildingId,
      roomNumber,
      floor,
      areaSqm,
      layout,
      direction,
    },
  };
}

export interface CredentialsInput {
  email: string;
  password: string;
}

export type CredentialsField = keyof CredentialsInput;

export type CredentialsFieldErrors = Partial<Record<CredentialsField, string>>;

export type CredentialsParseResult =
  | { ok: true; value: CredentialsInput }
  | { ok: false; errors: CredentialsFieldErrors };

const PASSWORD_MIN_LENGTH = 8;

export function parseCredentials(raw: {
  email?: string | null;
  password?: string | null;
}): CredentialsParseResult {
  const errors: CredentialsFieldErrors = {};

  const email = trimmed(raw.email).toLowerCase();
  if (email === '') {
    errors.email = 'メールアドレスを入力してください';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'メールアドレスの形式が正しくありません';
  }

  const password = raw.password ?? '';
  if (password === '') {
    errors.password = 'パスワードを入力してください';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { email, password } };
}
