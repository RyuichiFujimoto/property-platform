import dotenv from 'dotenv';
import postgres from 'postgres';

const POSTGRES_SCHEME = 'postgresql://';

/**
 * Supabase 等のパスワードに @ や / が含まれる場合、URL エンコードしてから接続する。
 *
 * @param {string} databaseUrl
 * @returns {string}
 */
export function normalizeConnectionString(databaseUrl) {
  if (!databaseUrl.startsWith(POSTGRES_SCHEME)) return databaseUrl;

  const rest = databaseUrl.slice(POSTGRES_SCHEME.length);
  const atIndex = rest.lastIndexOf('@');
  if (atIndex <= 0) return databaseUrl;

  const userInfo = rest.slice(0, atIndex);
  const hostPart = rest.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex <= 0) return databaseUrl;

  const user = encodeURIComponent(userInfo.slice(0, colonIndex));
  const password = encodeURIComponent(userInfo.slice(colonIndex + 1));
  return `${POSTGRES_SCHEME}${user}:${password}@${hostPart}`;
}

/**
 * @returns {string | null}
 */
export function readDatabaseUrl() {
  dotenv.config({ path: '.env.local' });
  return process.env.DATABASE_URL ?? null;
}

/**
 * @param {string} databaseUrl
 * @returns {import('postgres').Sql<{}>}
 */
export function createSqlClient(databaseUrl) {
  return postgres(normalizeConnectionString(databaseUrl), {
    max: 1,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * DATABASE_URL が未設定の場合はエラーメッセージを出して終了する（スクリプト用）。
 *
 * @returns {import('postgres').Sql<{}>}
 */
export function createSqlClientOrExit() {
  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }
  return createSqlClient(databaseUrl);
}
