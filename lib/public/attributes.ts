export type AttributeMap = Map<string, string | null>;

/**
 * entity_attribute_sources の行（attribute_name / attribute_value）を Map に変換する。
 * DB ドライバの行型をそのまま受け取れるよう Record で受ける。
 */
export function toAttributeMap(rows: readonly Record<string, unknown>[]): AttributeMap {
  return new Map(
    rows.map((row) => {
      const value = row.attribute_value;
      return [String(row.attribute_name), typeof value === 'string' ? value : null];
    })
  );
}

/**
 * entity_id ごとに属性 Map を作る（複数エンティティ分の行をまとめて取得した場合に使う）。
 */
export function groupAttributeMaps(rows: readonly Record<string, unknown>[]): Map<string, AttributeMap> {
  const grouped = new Map<string, AttributeMap>();
  for (const row of rows) {
    const entityId = String(row.entity_id);
    let map = grouped.get(entityId);
    if (!map) {
      map = new Map<string, string | null>();
      grouped.set(entityId, map);
    }
    for (const [key, value] of toAttributeMap([row])) map.set(key, value);
  }
  return grouped;
}

export function attrString(map: AttributeMap | undefined, key: string): string | null {
  return map?.get(key) ?? null;
}

export function attrNumber(map: AttributeMap | undefined, key: string): number | null {
  const value = attrString(map, key);
  if (!value) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
