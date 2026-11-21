import { afterEach, expect, test, vi } from 'vitest';
import postgres from 'postgres';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('postgres', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('applies the schema and row security in order and skips recorded migrations on rerun', async () => {
  const unsafe = vi.fn().mockResolvedValue(undefined);
  const versions = new Set<string>();
  const tx = Object.assign(
    vi.fn(async (strings: TemplateStringsArray, version?: string) => {
      const query = strings[0].trim();
      if (query.startsWith('SELECT version')) return [...versions].map((version) => ({ version }));
      if (query.startsWith('INSERT INTO schema_migrations') && version) versions.add(version);
      return [];
    }),
    { unsafe },
  );
  const begin = vi.fn(async (run: (transaction: typeof tx) => Promise<string[]>) => {
    return run(tx);
  });
  const end = vi.fn().mockResolvedValue(undefined);
  const databaseUrl = 'postgresql://user:pass@db.example.com:5432/postgres';
  vi.stubEnv('DATABASE_URL', databaseUrl);
  vi.stubEnv('DATABASE_CA_CERT', undefined);
  vi.stubEnv('DATABASE_SSL_MODE', undefined);
  vi.mocked(postgres).mockReturnValue({ begin, end } as unknown as ReturnType<typeof postgres>);
  vi.spyOn(console, 'log').mockImplementation(() => {});

  await import('../scripts/migrate.js');

  expect(postgres).toHaveBeenCalledWith(databaseUrl, { max: 1, ssl: 'verify-full' });
  expect(begin).toHaveBeenCalledTimes(1);
  expect(unsafe).toHaveBeenNthCalledWith(1, expect.stringContaining('CREATE TABLE IF NOT EXISTS mansions'));
  expect(unsafe).toHaveBeenNthCalledWith(2, expect.stringContaining('ALTER TABLE mansions ENABLE ROW LEVEL SECURITY'));
  expect(unsafe).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE POLICY owner_properties_select_own'));
  expect(tx).toHaveBeenCalledWith(expect.arrayContaining([
    'ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY',
  ]));
  expect([...versions]).toEqual(['001_initial.sql', '002_enable_rls.sql', '003_auth_and_owner.sql']);
  expect(end).toHaveBeenCalledTimes(1);

  vi.resetModules();
  await import('../scripts/migrate.js');

  expect(unsafe).toHaveBeenCalledTimes(3);
  expect(end).toHaveBeenCalledTimes(2);
});
