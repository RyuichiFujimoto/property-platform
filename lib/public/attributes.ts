import { logWarn } from '@/lib/errors';

export type AttributeMap = Map<string, string | null>;

export interface AttributeRow {
  attribute_name: string;
  attribute_value: string | null;
}

export interface EntityAttributeRow extends AttributeRow {
  entity_id: string;
}

export function toAttributeMap(rows: readonly AttributeRow[]): AttributeMap {
  return new Map(rows.map(({ attribute_name, attribute_value }) => [attribute_name, attribute_value]));
}

export function groupAttributeMaps(rows: readonly EntityAttributeRow[]): Map<string, AttributeMap> {
  const grouped = new Map<string, AttributeMap>();
  for (const { entity_id, attribute_name, attribute_value } of rows) {
    let map = grouped.get(entity_id);
    if (!map) {
      map = new Map();
      grouped.set(entity_id, map);
    }
    map.set(attribute_name, attribute_value);
  }
  return grouped;
}

export function attrString(map: AttributeMap | undefined, key: string): string | null {
  return map?.get(key) ?? null;
}

export function attrNumber(
  map: AttributeMap | undefined,
  key: string,
  entityId: string
): number | null {
  const value = attrString(map, key);
  if (!value) return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    logWarn('public/mansion', 'numeric attribute is not a number, dropping value', {
      entityId,
      attribute: key,
      value,
    });
    return null;
  }
  return n;
}
