import { afterEach, expect, test, vi } from 'vitest';
import postgres from 'postgres';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('postgres', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('applies the schema and row security in order in one verified TLS transaction', async () => {
  const unsafe = vi.fn().mockResolvedValue(undefined);
  const begin = vi.fn(async (run: (tx: { unsafe: typeof unsafe }) => Promise<void>) => {
    await run({ unsafe });
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
  expect(end).toHaveBeenCalledTimes(1);
});
