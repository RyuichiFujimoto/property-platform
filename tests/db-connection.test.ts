import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hostOf, normalizeConnectionString } from '../lib/db/connection.mjs';
import { postgresSslOption } from '../lib/db/ssl.js';

describe('normalizeConnectionString', () => {
  it('encodes credentials that contain @ and /', () => {
    expect(normalizeConnectionString('postgresql://user:p@ss/word@db.example.com:5432/postgres')).toBe(
      'postgresql://user:p%40ss%2Fword@db.example.com:5432/postgres'
    );
  });

  it('supports the postgres:// scheme', () => {
    expect(normalizeConnectionString('postgres://user:p@ss@db.example.com:5432/postgres')).toBe(
      'postgres://user:p%40ss@db.example.com:5432/postgres'
    );
  });

  it('does not double-encode already encoded credentials', () => {
    const url = 'postgresql://user:p%40ss@db.example.com:5432/postgres';
    expect(normalizeConnectionString(url)).toBe(url);
  });

  it('leaves credential-less and unknown urls untouched', () => {
    expect(normalizeConnectionString('postgresql://db.example.com:5432/postgres')).toBe(
      'postgresql://db.example.com:5432/postgres'
    );
    expect(normalizeConnectionString('mysql://user:pass@host/db')).toBe('mysql://user:pass@host/db');
  });
});

describe('hostOf', () => {
  it('extracts the hostname', () => {
    expect(hostOf('postgresql://user:pass@db.example.com:5432/postgres')).toBe('db.example.com');
  });

  it('returns null for unparsable urls', () => {
    expect(hostOf('not a url')).toBeNull();
  });
});

describe('postgresSslOption', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_CA_CERT', undefined);
    vi.stubEnv('DATABASE_SSL_MODE', undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('verifies certificates for remote hosts by default', () => {
    expect(postgresSslOption('postgresql://user:pass@db.example.com:5432/postgres')).toBe(
      'verify-full'
    );
  });

  it('skips TLS for local hosts', () => {
    expect(postgresSslOption('postgresql://user:pass@localhost:5432/postgres')).toBe(false);
    expect(postgresSslOption('postgresql://user:pass@127.0.0.1:5432/postgres')).toBe(false);
    expect(postgresSslOption('postgresql://user:pass@[::1]:5432/postgres')).toBe(false);
  });

  it('honours explicit DATABASE_SSL_MODE', () => {
    const url = 'postgresql://user:pass@db.example.com:5432/postgres';
    vi.stubEnv('DATABASE_SSL_MODE', 'disable');
    expect(postgresSslOption(url)).toBe('verify-full');
    vi.stubEnv('DATABASE_SSL_MODE', 'require');
    expect(postgresSslOption(url)).toBe('require');
    vi.stubEnv('DATABASE_SSL_MODE', 'no-verify');
    expect(postgresSslOption(url)).toBe('verify-full');
    vi.stubEnv('DATABASE_CA_CERT', 'custom-ca');
    expect(postgresSslOption(url)).toEqual({ rejectUnauthorized: true, ca: 'custom-ca' });
  });
});
