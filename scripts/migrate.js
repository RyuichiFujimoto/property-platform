import dotenv from 'dotenv';
import postgres from 'postgres';
import { postgresSslOption } from '../lib/db/ssl.js';
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
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

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
  ssl: postgresSslOption(connectionString),
});

try {
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // 途中で失敗した場合に DB が中途半端な状態で残らないよう、1 トランザクションで適用する。
  await sql.begin(async (tx) => {
    for (const file of migrationFiles) {
      const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await tx.unsafe(migration);
    }
  });
  for (const file of migrationFiles) {
    console.log(`Applied ${file}`);
  }
  console.log('Migrations applied successfully');
} catch (err) {
  console.error('Migration failed');
  console.error(err);
  process.exitCode = 1;
} finally {
  try {
    await sql.end();
  } catch (endErr) {
    // 接続クローズの失敗で本来のエラーを隠さない。
    console.error('Failed to close database connection');
    console.error(endErr);
    process.exitCode = 1;
  }
}
