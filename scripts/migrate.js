import dotenv from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial.sql');
const migration = fs.readFileSync(migrationFile, 'utf8');

// Supabase 等のパスワードに @ や / が含まれる場合、URL エンコードしてから接続する
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

const sql = postgres(connectionString, {
  max: 1,
  ssl: { rejectUnauthorized: false },
});

try {
  await sql.unsafe(migration);
  console.log('Migration applied successfully');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
