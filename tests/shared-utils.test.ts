import { describe, expect, test } from 'vitest';
import { normalizeConnectionString } from '../lib/db/connection.js';
import { idFactory } from '../lib/ids.js';
import { requireEnv } from '../lib/env';
import { joinDefined } from '../lib/format';
import {
  attrNumber,
  attrString,
  groupAttributeMaps,
  toAttributeMap,
} from '../lib/public/attributes';

describe('normalizeConnectionString', () => {
  test('encodes user info containing special characters', () => {
    expect(normalizeConnectionString('postgresql://user:p@ss/word@db.example.com:5432/postgres')).toBe(
      'postgresql://user:p%40ss%2Fword@db.example.com:5432/postgres'
    );
  });

  test('leaves non-postgresql urls untouched', () => {
    expect(normalizeConnectionString('postgres://user:pass@host/db')).toBe(
      'postgres://user:pass@host/db'
    );
  });

  test('leaves urls without user info untouched', () => {
    expect(normalizeConnectionString('postgresql://host/db')).toBe('postgresql://host/db');
  });
});

describe('idFactory', () => {
  test('prefixes generated ids and keeps them unique', () => {
    const newId = idFactory('MAN');
    const a = newId();
    const b = newId();
    expect(a.startsWith('MAN_')).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('requireEnv', () => {
  test('returns the value when set', () => {
    expect(requireEnv('value', 'SOME_KEY')).toBe('value');
  });

  test('throws with the variable name when missing', () => {
    expect(() => requireEnv(undefined, 'SOME_KEY')).toThrow('SOME_KEY is not set');
  });
});

describe('joinDefined', () => {
  test('drops empty parts', () => {
    expect(joinDefined(['a', null, '', undefined, 'b'])).toBe('a / b');
  });

  test('supports a custom separator', () => {
    expect(joinDefined(['a', 'b'], ' ')).toBe('a b');
  });
});

describe('attribute helpers', () => {
  const map = toAttributeMap([
    { attribute_name: 'structure', attribute_value: 'RC' },
    { attribute_name: 'total_units', attribute_value: '120' },
    { attribute_name: 'built_year', attribute_value: 'not-a-number' },
    { attribute_name: 'town', attribute_value: null },
  ]);

  test('reads string attributes and normalizes missing values to null', () => {
    expect(attrString(map, 'structure')).toBe('RC');
    expect(attrString(map, 'town')).toBeNull();
    expect(attrString(map, 'unknown')).toBeNull();
    expect(attrString(undefined, 'structure')).toBeNull();
  });

  test('groups rows per entity_id', () => {
    const grouped = groupAttributeMaps([
      { entity_id: 'BLD_1', attribute_name: 'structure', attribute_value: 'RC' },
      { entity_id: 'BLD_1', attribute_name: 'total_units', attribute_value: '10' },
      { entity_id: 'BLD_2', attribute_name: 'structure', attribute_value: 'SRC' },
    ]);
    expect(attrString(grouped.get('BLD_1'), 'structure')).toBe('RC');
    expect(attrNumber(grouped.get('BLD_1'), 'total_units')).toBe(10);
    expect(attrString(grouped.get('BLD_2'), 'structure')).toBe('SRC');
    expect(grouped.get('BLD_3')).toBeUndefined();
  });

  test('reads numeric attributes and rejects non-numeric values', () => {
    expect(attrNumber(map, 'total_units')).toBe(120);
    expect(attrNumber(map, 'built_year')).toBeNull();
    expect(attrNumber(map, 'unknown')).toBeNull();
    expect(attrNumber(undefined, 'total_units')).toBeNull();
  });
});
