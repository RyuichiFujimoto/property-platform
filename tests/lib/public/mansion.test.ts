import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';

const getSql = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ getSql }));

type Row = Record<string, unknown>;

/**
 * postgres.js の tagged template を模した mock。
 * template 呼び出しごとに results を先頭から順に返し、
 * sql(array) 形式の fragment 呼び出しは query 文字列に展開しない。
 */
function createSqlMock(results: Row[][]) {
  const queries: string[] = [];
  const sql = (...args: unknown[]) => {
    const first = args[0];
    if (Array.isArray(first) && 'raw' in first) {
      queries.push((first as unknown as string[]).join(' ? ').replace(/\s+/g, ' ').trim());
      return Promise.resolve(results.shift() ?? []);
    }
    return { fragment: first };
  };
  return { sql, queries };
}

async function importModule() {
  return import('@/lib/public/mansion');
}

describe('getPublicMansion', () => {
  const envKeys = ['ALLOW_PREVIEW_DATA', 'VERCEL_ENV'] as const;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) savedEnv[key] = process.env[key];
    delete process.env.ALLOW_PREVIEW_DATA;
    delete process.env.VERCEL_ENV;
    vi.stubEnv('NODE_ENV', 'production');
    getSql.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  test('preview mode 時は DB を参照せず fixture を返す', async () => {
    process.env.ALLOW_PREVIEW_DATA = 'true';
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('any-slug')).resolves.toStrictEqual(fixtureMansion);
    expect(getSql).not.toHaveBeenCalled();
  });

  test('VERCEL_ENV=preview でも fixture を返す', async () => {
    process.env.VERCEL_ENV = 'preview';
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('any-slug')).resolves.toStrictEqual(fixtureMansion);
  });

  test('NODE_ENV=development でも fixture を返す', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('any-slug')).resolves.toStrictEqual(fixtureMansion);
  });

  test('DB 接続が無い場合は null を返す', async () => {
    getSql.mockReturnValue(null);
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('fixture-mansion')).resolves.toBeNull();
  });

  test('公開中の mansion が存在しない場合は null を返す', async () => {
    const { sql } = createSqlMock([[]]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('missing')).resolves.toBeNull();
  });

  test('canonical_name が公開許可されていない場合は null を返す', async () => {
    const { sql } = createSqlMock([
      [{ id: 'MAN_1', public_id: 'MAN_1' }],
      [{ attribute_name: 'address', attribute_value: '東京都新宿区新宿1-1-1' }],
    ]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    await expect(getPublicMansion('no-name')).resolves.toBeNull();
  });

  test('mansion 属性と棟情報を PublicMansion に変換する', async () => {
    const { sql, queries } = createSqlMock([
      [{ id: 'MAN_1', public_id: 'PUB_1' }],
      [
        { attribute_name: 'canonical_name', attribute_value: 'テストマンション' },
        { attribute_name: 'address', attribute_value: '東京都新宿区新宿1-1-1' },
        { attribute_name: 'ward', attribute_value: '新宿区' },
        { attribute_name: 'town', attribute_value: '新宿' },
        { attribute_name: 'built_year', attribute_value: '2020' },
        { attribute_name: 'built_month', attribute_value: '6' },
        { attribute_name: 'total_units', attribute_value: '120' },
        { attribute_name: 'developer', attribute_value: 'テスト不動産' },
        { attribute_name: 'constructor', attribute_value: 'テスト建設' },
        { attribute_name: 'management_company', attribute_value: 'テスト管理' },
        { attribute_name: 'structure', attribute_value: '鉄筋コンクリート造' },
        { attribute_name: 'mansion_type', attribute_value: 'tower' },
        { attribute_name: 'nearest_station', attribute_value: 'JR 新宿駅 徒歩5分' },
      ],
      [
        { id: 'BLD_1', public_id: 'PUB_BLD_1', canonical_name: 'テストマンション', building_label: 'A棟' },
        { id: 'BLD_2', public_id: 'PUB_BLD_2', canonical_name: null, building_label: 'B棟' },
      ],
      [
        { entity_id: 'BLD_1', attribute_name: 'floors_above', attribute_value: '20' },
        { entity_id: 'BLD_1', attribute_name: 'floors_below', attribute_value: '1' },
        { entity_id: 'BLD_1', attribute_name: 'total_units', attribute_value: '120' },
        { entity_id: 'BLD_1', attribute_name: 'structure', attribute_value: '鉄筋コンクリート造' },
        { entity_id: 'BLD_1', attribute_name: 'built_year', attribute_value: '2020' },
        { entity_id: 'BLD_1', attribute_name: 'built_month', attribute_value: '6' },
        { entity_id: 'BLD_UNKNOWN', attribute_name: 'structure', attribute_value: '無視される' },
      ],
    ]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    const result = await getPublicMansion('test-mansion');

    expect(result).toEqual({
      id: 'MAN_1',
      publicId: 'PUB_1',
      slug: 'test-mansion',
      canonicalName: 'テストマンション',
      address: '東京都新宿区新宿1-1-1',
      ward: '新宿区',
      town: '新宿',
      builtYear: 2020,
      builtMonth: 6,
      totalUnits: 120,
      developer: 'テスト不動産',
      constructor: 'テスト建設',
      managementCompany: 'テスト管理',
      structure: '鉄筋コンクリート造',
      mansionType: 'tower',
      nearestStation: 'JR 新宿駅 徒歩5分',
      buildings: [
        {
          id: 'BLD_1',
          canonicalName: 'テストマンション',
          buildingLabel: 'A棟',
          floorsAbove: 20,
          floorsBelow: 1,
          totalUnits: 120,
          structure: '鉄筋コンクリート造',
          builtYear: 2020,
          builtMonth: 6,
        },
        {
          id: 'BLD_2',
          canonicalName: null,
          buildingLabel: 'B棟',
          floorsAbove: null,
          floorsBelow: null,
          totalUnits: null,
          structure: null,
          builtYear: null,
          builtMonth: null,
        },
      ],
    });
    expect(queries).toHaveLength(4);
    expect(queries[1]).toContain("publication_allowed = true");
  });

  test('公開許可されていない属性は null になり、数値化できない値も null になる', async () => {
    const { sql } = createSqlMock([
      [{ id: 'MAN_1', public_id: 'PUB_1' }],
      [
        { attribute_name: 'canonical_name', attribute_value: 'テストマンション' },
        { attribute_name: 'built_year', attribute_value: '不明' },
        { attribute_name: 'total_units', attribute_value: null },
      ],
      [],
    ]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    const result = await getPublicMansion('test-mansion');

    expect(result).toMatchObject({
      builtYear: null,
      builtMonth: null,
      totalUnits: null,
      address: null,
      developer: null,
      buildings: [],
    });
  });

  test('棟が無い場合は棟属性クエリを実行しない', async () => {
    const { sql, queries } = createSqlMock([
      [{ id: 'MAN_1', public_id: 'PUB_1' }],
      [{ attribute_name: 'canonical_name', attribute_value: 'テストマンション' }],
      [],
    ]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    await getPublicMansion('test-mansion');

    expect(queries).toHaveLength(3);
  });

  test('canonical_name も building_label も無い棟は公開対象から除外する', async () => {
    const { sql } = createSqlMock([
      [{ id: 'MAN_1', public_id: 'PUB_1' }],
      [{ attribute_name: 'canonical_name', attribute_value: 'テストマンション' }],
      [{ id: 'BLD_1', canonical_name: null, building_label: null }],
      [],
    ]);
    getSql.mockReturnValue(sql);
    const { getPublicMansion } = await importModule();

    const result = await getPublicMansion('test-mansion');

    expect(result?.buildings).toEqual([]);
  });
});
