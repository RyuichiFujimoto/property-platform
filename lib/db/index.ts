import type postgres from 'postgres';
import { createSqlClient, readDatabaseUrl } from '@/lib/db/connection';

let sqlInstance: postgres.Sql<{}> | null = null;

export function getSql(): postgres.Sql<{}> | null {
  if (sqlInstance) return sqlInstance;

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) return null;

  sqlInstance = createSqlClient(databaseUrl);
  return sqlInstance;
}
