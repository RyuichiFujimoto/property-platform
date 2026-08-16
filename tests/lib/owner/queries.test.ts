import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { OwnerPropertyInput } from '@/lib/owner/validation';

const getSql = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ getSql }));

type Row = Record<string, unknown>;

/**
 * postgres.js の tagged template を模した mock。
 * template 呼び出しごとに results を先頭から順に返し、
 * bind される値と展開後のクエリ文字列を検証できるようにする。
 */
function createSqlMock(results: Row[][]) {
  const queries: string[] = [];
  const values: unknown[][] = [];
  const sql = (...args: unknown[]) => {
    const [first, ...rest] = args;
    queries.push((first as string[]).join(' ? ').replace(/\s+/g, ' ').trim());
    values.push(rest);
    return Promise.resolve(results.shift() ?? []);
  };
  sql.unsafe = (text: string) => text;
  return { sql, queries, values };
}

const INPUT: OwnerPropertyInput = {
  mansionId: 'MAN_1',
  buildingId: 'BLD_1',
  roomNumber: '1203',
  floor: 12,
  areaSqm: 70.25,
  layout: '3LDK',
  direction: '南東',
};

const ROW = {
  id: 'OWP_1',
  mansion_id: 'MAN_1',
  building_id: 'BLD_1',
  room_number: '1203',
  floor: 12,
  area_sqm: '70.25',
  layout: '3LDK',
  direction: '南東',
  registered_at: new Date('2026-01-02T03:04:05.000Z'),
};

beforeEach(() => {
  getSql.mockReset();
  vi.resetModules();
});

describe('insertOwnerProperty', () => {
  test('DB 未接続なら unavailable を返す', async () => {
    getSql.mockReturnValue(null);
    const { insertOwnerProperty } = await import('@/lib/owner/queries');

    await expect(insertOwnerProperty('user-1', INPUT)).resolves.toStrictEqual({
      status: 'unavailable',
    });
  });

  test('登録に成功すると created と正規化した値を返す', async () => {
    const { sql, values } = createSqlMock([[ROW]]);
    getSql.mockReturnValue(sql);
    const { insertOwnerProperty } = await import('@/lib/owner/queries');

    const result = await insertOwnerProperty('user-1', INPUT);

    expect(result).toStrictEqual({
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
        registeredAt: '2026-01-02T03:04:05.000Z',
      },
    });
    // id は生成、user_id と入力値がそのまま bind される
    expect(values[0][0]).toMatch(/^OWP_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(values[0].slice(1)).toStrictEqual([
      'user-1',
      'MAN_1',
      'BLD_1',
      '1203',
      12,
      70.25,
      '3LDK',
      '南東',
    ]);
  });

  test('unique index に衝突して 0 行なら duplicate を返す', async () => {
    const { sql } = createSqlMock([[]]);
    getSql.mockReturnValue(sql);
    const { insertOwnerProperty } = await import('@/lib/owner/queries');

    await expect(insertOwnerProperty('user-1', INPUT)).resolves.toStrictEqual({
      status: 'duplicate',
    });
  });
});

describe('listOwnerProperties', () => {
  test('DB 未接続なら空配列を返す', async () => {
    getSql.mockReturnValue(null);
    const { listOwnerProperties } = await import('@/lib/owner/queries');

    await expect(listOwnerProperties('user-1')).resolves.toStrictEqual([]);
  });

  test('ユーザーの登録一覧を変換して返す', async () => {
    const { sql, values } = createSqlMock([
      [
        ROW,
        {
          ...ROW,
          id: 'OWP_2',
          building_id: null,
          room_number: null,
          floor: null,
          area_sqm: null,
          layout: null,
          direction: null,
          registered_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    ]);
    getSql.mockReturnValue(sql);
    const { listOwnerProperties } = await import('@/lib/owner/queries');

    const result = await listOwnerProperties('user-1');

    expect(values[0]).toStrictEqual(['user-1']);
    expect(result).toHaveLength(2);
    expect(result[1]).toStrictEqual({
      id: 'OWP_2',
      mansionId: 'MAN_1',
      buildingId: null,
      roomNumber: null,
      floor: null,
      areaSqm: null,
      layout: null,
      direction: null,
      registeredAt: '2026-01-01T00:00:00.000Z',
    });
  });

  test('数値として解釈できない面積は null にする', async () => {
    const { sql } = createSqlMock([[{ ...ROW, area_sqm: 'unknown' }]]);
    getSql.mockReturnValue(sql);
    const { listOwnerProperties } = await import('@/lib/owner/queries');

    const [property] = await listOwnerProperties('user-1');

    expect(property.areaSqm).toBeNull();
  });
});

describe('countOwnerProperties', () => {
  test('DB 未接続なら 0 を返す', async () => {
    getSql.mockReturnValue(null);
    const { countOwnerProperties } = await import('@/lib/owner/queries');

    await expect(countOwnerProperties('user-1')).resolves.toBe(0);
  });

  test('件数を数値で返す', async () => {
    const { sql } = createSqlMock([[{ count: '3' }]]);
    getSql.mockReturnValue(sql);
    const { countOwnerProperties } = await import('@/lib/owner/queries');

    await expect(countOwnerProperties('user-1')).resolves.toBe(3);
  });

  test('行が返らなければ 0 を返す', async () => {
    const { sql } = createSqlMock([[]]);
    getSql.mockReturnValue(sql);
    const { countOwnerProperties } = await import('@/lib/owner/queries');

    await expect(countOwnerProperties('user-1')).resolves.toBe(0);
  });
});

describe('newOwnerPropertyId', () => {
  test('OWP_ プレフィックス付きの ULID を返す', async () => {
    const { newOwnerPropertyId } = await import('@/lib/owner/queries');

    expect(newOwnerPropertyId()).toMatch(/^OWP_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(newOwnerPropertyId()).not.toBe(newOwnerPropertyId());
  });
});
