import dotenv from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeConnectionString, sslConfigFor } from '../lib/db/connection.mjs';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const sql = postgres(normalizeConnectionString(DATABASE_URL), {
  max: 1,
  ssl: sslConfigFor(DATABASE_URL),
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql`SELECT version FROM schema_migrations`).map((row) => row.version)
  );

  let appliedCount = 0;
  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }

    const statements = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // 1 migration = 1 transaction。途中で失敗しても部分適用にならない
    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`INSERT INTO schema_migrations (version) VALUES (${file})`;
    });
    appliedCount += 1;
    console.log(`applied ${file}`);
  }

  console.log(`Migration completed (${appliedCount} applied, ${migrationFiles.length} total)`);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
