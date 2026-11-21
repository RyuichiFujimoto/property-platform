import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SimplePage } from '../components/SimplePage';
import { idFactory } from '../lib/ids.js';
import { requireEnv } from '../lib/env';
import { ConfigurationError } from '../lib/errors';
import { joinDefined } from '../lib/format';
import {
  attrNumber,
  attrString,
  groupAttributeMaps,
  toAttributeMap,
} from '../lib/public/attributes';

test('SimplePage renders the shared layout with an optional title class', () => {
  const props = { title: 'Title', description: 'Description' };
  const render = (titleClassName?: string) =>
    renderToStaticMarkup(createElement(SimplePage, { ...props, titleClassName }));

  expect(render()).toBe(
    '<main class="p-6"><h1 class="text-2xl font-bold">Title</h1><p class="mt-4 text-slate-600">Description</p></main>'
  );
  expect(render('text-primary')).toContain('<h1 class="text-primary">Title</h1>');
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
    expect(() => requireEnv(undefined, 'SOME_KEY')).toThrow(ConfigurationError);
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
    expect(attrNumber(grouped.get('BLD_1'), 'total_units', 'BLD_1')).toBe(10);
    expect(attrString(grouped.get('BLD_2'), 'structure')).toBe('SRC');
    expect(grouped.get('BLD_3')).toBeUndefined();
  });

  test('reads numeric attributes and rejects non-numeric values', () => {
    expect(attrNumber(map, 'total_units', 'MAN_1')).toBe(120);
    expect(attrNumber(map, 'built_year', 'MAN_1')).toBeNull();
    expect(attrNumber(map, 'unknown', 'MAN_1')).toBeNull();
    expect(attrNumber(undefined, 'total_units', 'MAN_1')).toBeNull();
  });
});
