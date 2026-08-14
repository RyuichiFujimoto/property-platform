import dotenv from 'dotenv';
import postgres from 'postgres';
import { postgresSslOption } from './ssl.js';

let sqlInstance: postgres.Sql<{}> | null = null;

export function getSql(): postgres.Sql<{}> | null {
  if (sqlInstance) return sqlInstance;

  dotenv.config({ path: '.env.local' });

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    return null;
  }

  let connectionString = DATABASE_URL;
  if (connectionString.startsWith('postgresql://')) {
    const rest = connectionString.slice('postgresql://'.length);
    const atIndex = rest.lastIndexOf('@');
    if (atIndex > 0) {
      const userInfo = rest.slice(0, atIndex);
      const hostPart = rest.slice(atIndex + 1);
      const colonIndex = userInfo.indexOf(':');
      if (colonIndex > 0) {
        const user = userInfo.slice(0, colonIndex);
        const password = userInfo.slice(colonIndex + 1);
        connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}`;
      }
    }
  }

  sqlInstance = postgres(connectionString, {
    max: 1,
    ssl: postgresSslOption(connectionString),
  });

  return sqlInstance;
}
