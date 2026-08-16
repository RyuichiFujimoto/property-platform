import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const postgresMock = vi.hoisted(() => vi.fn(() => ({ tag: 'sql-instance' })));
const dotenvConfig = vi.hoisted(() => vi.fn());

vi.mock('postgres', () => ({ default: postgresMock }));
vi.mock('dotenv', () => ({ default: { config: dotenvConfig } }));

async function importGetSql() {
  const mod = await import('@/lib/db');
  return mod.getSql;
}

describe('getSql', () => {
  const savedUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
    postgresMock.mockClear();
    dotenvConfig.mockClear();
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedUrl;
  });

  test('DATABASE_URL が無い場合は ConfigurationError を投げる', async () => {
    delete process.env.DATABASE_URL;
    const getSql = await importGetSql();

    expect(() => getSql()).toThrow(/DATABASE_URL is not set/);
    expect(dotenvConfig).toHaveBeenCalledWith({ path: '.env.local' });
    expect(postgresMock).not.toHaveBeenCalled();
  });

  test('接続文字列と接続オプションを postgres に渡す', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/postgres';
    const getSql = await importGetSql();

    expect(getSql()).toEqual({ tag: 'sql-instance' });
    expect(postgresMock).toHaveBeenCalledWith('postgresql://user:pass@db.example.com:5432/postgres', {
      max: 1,
      ssl: { rejectUnauthorized: false },
      onnotice: expect.any(Function),
    });
  });

  test('user / password に記号が含まれる場合は URL エンコードする', async () => {
    process.env.DATABASE_URL = 'postgresql://user@corp:p@ss/w0rd@db.example.com:5432/postgres';
    const getSql = await importGetSql();
    getSql();

    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://user%40corp:p%40ss%2Fw0rd@db.example.com:5432/postgres',
      expect.anything(),
    );
  });

  test('password 部分が無い場合は接続文字列をそのまま使う', async () => {
    process.env.DATABASE_URL = 'postgresql://user@db.example.com:5432/postgres';
    const getSql = await importGetSql();
    getSql();

    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://user@db.example.com:5432/postgres',
      expect.anything(),
    );
  });

  test('postgresql:// 以外の scheme は加工しない', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@db.example.com:5432/postgres';
    const getSql = await importGetSql();
    getSql();

    expect(postgresMock).toHaveBeenCalledWith(
      'postgres://user:pass@db.example.com:5432/postgres',
      expect.anything(),
    );
  });

  test('2 回目以降は同じ instance を再利用する', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/postgres';
    const getSql = await importGetSql();

    const first = getSql();
    const second = getSql();

    expect(second).toBe(first);
    expect(postgresMock).toHaveBeenCalledTimes(1);
    expect(dotenvConfig).toHaveBeenCalledTimes(1);
  });
});
