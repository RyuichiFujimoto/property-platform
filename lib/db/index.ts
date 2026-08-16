import dotenv from 'dotenv';
import postgres from 'postgres';
import { ConfigurationError, logError } from '@/lib/errors';

let sqlInstance: postgres.Sql<{}> | null = null;

function loadDatabaseUrl(): string | undefined {
  dotenv.config({ path: '.env.local' });
  return process.env.DATABASE_URL;
}

/**
 * DB 接続設定が存在するかどうか。
 * 接続を確立せずに判定できるので、DB 未設定でも動く経路（ビルド時など）で使う。
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(loadDatabaseUrl());
}

/** Supabase 等のパスワードに @ や / が含まれる場合、URL エンコードしてから接続する。 */
function normalizeConnectionString(databaseUrl: string): string {
  if (!databaseUrl.startsWith('postgresql://')) return databaseUrl;

  const rest = databaseUrl.slice('postgresql://'.length);
  const atIndex = rest.lastIndexOf('@');
  if (atIndex <= 0) return databaseUrl;

  const userInfo = rest.slice(0, atIndex);
  const hostPart = rest.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex <= 0) return databaseUrl;

  const user = userInfo.slice(0, colonIndex);
  const password = userInfo.slice(colonIndex + 1);
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}`;
}

/**
 * DB クライアントを取得する。接続は遅延生成なので、ビルド時には呼ばれない。
 * 設定が欠けている場合は ConfigurationError を投げる。
 * null を返して「データが無い」ように見せると、設定ミスが 404 として埋もれてしまう。
 */
export function getSql(): postgres.Sql<{}> {
  if (sqlInstance) return sqlInstance;

  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    throw new ConfigurationError(
      'DATABASE_URL is not set. Set it in .env.local or in the deployment environment.'
    );
  }

  sqlInstance = postgres(normalizeConnectionString(databaseUrl), {
    max: 1,
    ssl: { rejectUnauthorized: false },
    onnotice: (notice) => {
      if (notice.severity === 'WARNING' || notice.severity === 'ERROR') {
        logError('db', `postgres notice: ${notice.message}`, undefined, {
          severity: notice.severity,
        });
      }
    },
  });

  return sqlInstance;
}
