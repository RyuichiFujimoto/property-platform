import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSqlClientOrExit } from '../lib/db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial.sql');
const migration = fs.readFileSync(migrationFile, 'utf8');

const sql = createSqlClientOrExit();

try {
  await sql.unsafe(migration);
  console.log('Migration applied successfully');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
