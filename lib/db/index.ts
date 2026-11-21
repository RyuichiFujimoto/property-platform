import dotenv from 'dotenv';
import postgres from 'postgres';
import { ConfigurationError, logError } from '@/lib/errors';
import { normalizeConnectionString } from './connection.mjs';
import { postgresSslOption } from './ssl.js';

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

  const connectionString = normalizeConnectionString(databaseUrl);
  sqlInstance = postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    ssl: postgresSslOption(connectionString),
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
