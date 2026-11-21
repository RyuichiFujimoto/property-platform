import postgres from 'postgres';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('postgres', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('reuses source and entity IDs without replacing reviewed data or approved provenance', async () => {
  const tx = vi.fn((parts: TemplateStringsArray | object[]) => {
    if (!('raw' in parts)) return parts;
    if (/SELECT id|INSERT INTO source_observations/.test(parts[0])) {
      return Promise.resolve([{ id: 'existing-id' }]);
    }
    return Promise.resolve([]);
  });
  const begin = vi.fn(async (run: (transaction: typeof tx) => Promise<void>) => run(tx));
  const end = vi.fn().mockResolvedValue(undefined);
  const databaseUrl = 'postgresql://user:pass@db.example.com:5432/postgres';
  vi.stubEnv('DATABASE_URL', databaseUrl);
  vi.stubEnv('DATABASE_CA_CERT', undefined);
  vi.stubEnv('DATABASE_SSL_MODE', undefined);
  vi.mocked(postgres).mockReturnValue({ begin, end } as unknown as ReturnType<typeof postgres>);
  vi.spyOn(console, 'log').mockImplementation(() => {});

  await import('../scripts/seed-pr3.js');

  const queries = tx.mock.calls
    .flatMap((call) => ('raw' in call[0] ? [call[0].join('?').trim()] : []));
  expect(postgres).toHaveBeenCalledWith(databaseUrl, { max: 1, ssl: 'verify-full' });
  expect(queries).not.toContainEqual(expect.stringMatching(/^INSERT INTO (data_sources|raw_source_records)/));
  for (const table of ['projects', 'mansions', 'buildings']) {
    expect(queries).toContainEqual(expect.stringContaining(
      `WHERE ${table}.public_status = 'draft' AND ${table}.review_status = 'pending'`,
    ));
  }
  expect(queries).toContainEqual(expect.stringMatching(
    /^DELETE FROM entity_attribute_sources[\s\S]*AND publication_allowed = false$/,
  ));
  expect(end).toHaveBeenCalledTimes(1);
});
