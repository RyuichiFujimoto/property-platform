import { describe, expect, it } from 'vitest';
import { hostOf, normalizeConnectionString, sslConfigFor } from '../lib/db/connection.mjs';

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

describe('sslConfigFor', () => {
  it('verifies certificates for remote hosts by default', () => {
    expect(sslConfigFor('postgresql://user:pass@db.example.com:5432/postgres', undefined)).toBe(
      'require'
    );
  });

  it('skips TLS for local hosts', () => {
    expect(sslConfigFor('postgresql://user:pass@localhost:5432/postgres', undefined)).toBe(false);
    expect(sslConfigFor('postgresql://user:pass@127.0.0.1:5432/postgres', undefined)).toBe(false);
  });

  it('honours explicit DATABASE_SSL_MODE', () => {
    const url = 'postgresql://user:pass@db.example.com:5432/postgres';
    expect(sslConfigFor(url, 'disable')).toBe(false);
    expect(sslConfigFor(url, 'require')).toBe('require');
    expect(sslConfigFor(url, 'no-verify')).toEqual({ rejectUnauthorized: false });
  });
});
