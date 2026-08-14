import dotenv from 'dotenv';
import postgres from 'postgres';
import { normalizeConnectionString, sslConfigFor } from './connection.mjs';

let sqlInstance: postgres.Sql | null = null;
let dotenvLoaded = false;

function loadLocalEnv(): void {
  if (dotenvLoaded || process.env.NODE_ENV === 'production') return;
  dotenv.config({ path: '.env.local' });
  dotenvLoaded = true;
}

/**
 * DATABASE_URL が無い場合は null を返す。
 * build 時のように DB 接続が無くても動く必要がある経路のみで使う。
 */
export function getSql(): postgres.Sql | null {
  if (sqlInstance) return sqlInstance;

  loadLocalEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  sqlInstance = postgres(normalizeConnectionString(databaseUrl), {
    max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    ssl: sslConfigFor(databaseUrl),
  });

  return sqlInstance;
}

/**
 * リクエスト処理中に使う。設定不足は「データが無い」ではなく障害として扱う。
 */
export function getSqlOrThrow(): postgres.Sql {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not set');
  return sql;
}
