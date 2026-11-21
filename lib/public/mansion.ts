import { getSql } from '@/lib/db';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';

export interface PublicBuilding {
  id: string;
  canonicalName: string;
  buildingLabel: string | null;
  floorsAbove: number | null;
  floorsBelow: number | null;
  totalUnits: number | null;
  structure: string | null;
  builtYear: number | null;
  builtMonth: number | null;
}

export interface PublicMansion {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  address: string | null;
  ward: string | null;
  town: string | null;
  builtYear: number | null;
  builtMonth: number | null;
  totalUnits: number | null;
  developer: string | null;
  'constructor': string | null;
  managementCompany: string | null;
  structure: string | null;
  mansionType: string | null;
  nearestStation: string | null;
  buildings: PublicBuilding[];
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

function isPreviewMode(): boolean {
  // 本番環境では fixture（未検証データ）を絶対に返さない。
  if (process.env.VERCEL_ENV === 'production') return false;

  return (
    process.env.ALLOW_PREVIEW_DATA === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'development'
  );
}

function getAttr(map: Map<string, string | null>, key: string): string | null {
  const v = map.get(key);
  return v === undefined ? null : v;
}

function toNum(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function getPublicMansion(slug: string): Promise<PublicMansion | null> {
  if (!SLUG_PATTERN.test(slug)) return null;

  if (isPreviewMode()) {
    return fixtureMansion;
  }

  const sql = getSql();
  if (!sql) return null;

  const [mansion] = await sql`
    SELECT id, public_id, project_id, public_status, review_status
    FROM mansions
    WHERE slug = ${slug} AND public_status = 'published' AND review_status = 'approved'
  `;

  if (!mansion) return null;

  const mansionAttrs = await sql`
    SELECT attribute_name, attribute_value
    FROM entity_attribute_sources
    WHERE entity_type = 'mansion'
      AND entity_id = ${mansion.id}
      AND publication_allowed = true
  `;
  const m = new Map(mansionAttrs.map((a) => [a.attribute_name, a.attribute_value]));
  const canonicalName = getAttr(m, 'canonical_name');

  if (!canonicalName) return null;

  const buildings = await sql`
    SELECT id, public_id, canonical_name, building_label
    FROM buildings
    WHERE mansion_id = ${mansion.id}
      AND public_status = 'published'
      AND review_status = 'approved'
  `;

  const buildingAttrMap = new Map<string, Map<string, string | null>>();
  for (const b of buildings) buildingAttrMap.set(b.id, new Map());

  if (buildings.length > 0) {
    const buildingIds = buildings.map((b) => b.id);
    const buildingAttrs = await sql`
      SELECT entity_id, attribute_name, attribute_value
      FROM entity_attribute_sources
      WHERE entity_type = 'building'
        AND entity_id IN ${sql(buildingIds)}
        AND publication_allowed = true
    `;
    for (const a of buildingAttrs) {
      const map = buildingAttrMap.get(a.entity_id);
      if (map) map.set(a.attribute_name, a.attribute_value);
    }
  }

  const publicBuildings: PublicBuilding[] = [];
  for (const b of buildings) {
    const attrs = buildingAttrMap.get(b.id);
    if (!b.canonical_name && !b.building_label) continue;
    publicBuildings.push({
      id: b.id,
      canonicalName: b.canonical_name,
      buildingLabel: b.building_label,
      floorsAbove: toNum(attrs ? getAttr(attrs, 'floors_above') : null),
      floorsBelow: toNum(attrs ? getAttr(attrs, 'floors_below') : null),
      totalUnits: toNum(attrs ? getAttr(attrs, 'total_units') : null),
      structure: getAttr(attrs ?? new Map(), 'structure'),
      builtYear: toNum(attrs ? getAttr(attrs, 'built_year') : null),
      builtMonth: toNum(attrs ? getAttr(attrs, 'built_month') : null),
    });
  }

  return {
    id: mansion.id,
    publicId: mansion.public_id,
    slug,
    canonicalName,
    address: getAttr(m, 'address'),
    ward: getAttr(m, 'ward'),
    town: getAttr(m, 'town'),
    builtYear: toNum(getAttr(m, 'built_year')),
    builtMonth: toNum(getAttr(m, 'built_month')),
    totalUnits: toNum(getAttr(m, 'total_units')),
    developer: getAttr(m, 'developer'),
    'constructor': getAttr(m, 'constructor'),
    managementCompany: getAttr(m, 'management_company'),
    structure: getAttr(m, 'structure'),
    mansionType: getAttr(m, 'mansion_type'),
    nearestStation: getAttr(m, 'nearest_station'),
    buildings: publicBuildings,
  };
}
