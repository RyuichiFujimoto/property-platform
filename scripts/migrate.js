import dotenv from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeConnectionString } from '../lib/db/connection.mjs';
import { postgresSslOption } from '../lib/db/ssl.js';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

const connectionString = normalizeConnectionString(DATABASE_URL);
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
  const pending = await sql.begin(async (tx) => {
    await tx`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY`;

    const applied = new Set(
      (await tx`SELECT version FROM schema_migrations`).map((row) => row.version)
    );
    const pending = migrationFiles.filter((file) => !applied.has(file));

    for (const file of pending) {
      const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await tx.unsafe(migration);
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
    }
    return pending;
  });

  for (const file of pending) {
    console.log(`Applied ${file}`);
  }
  console.log(`Migration completed (${pending.length} applied, ${migrationFiles.length - pending.length} already applied)`);
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
