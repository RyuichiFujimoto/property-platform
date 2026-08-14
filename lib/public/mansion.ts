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
  constructorName: string | null;
  managementCompany: string | null;
  structure: string | null;
  mansionType: string | null;
  nearestStation: string | null;
  buildings: PublicBuilding[];
}

interface MansionRow {
  id: string;
  public_id: string;
}

interface BuildingRow {
  id: string;
  canonical_name: string | null;
  building_label: string | null;
}

interface AttributeRow {
  entity_id: string;
  attribute_name: string;
  attribute_value: string | null;
}

/**
 * プレビュー用の架空データを返してよい環境かどうか。
 * production では環境変数に関係なく必ず false を返す。
 */
export function isPreviewMode(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  return (
    process.env.ALLOW_PREVIEW_DATA === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'development'
  );
}

export function getAttr(map: Map<string, string | null>, key: string): string | null {
  const v = map.get(key);
  return v === undefined ? null : v;
}

export function toNum(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getPublicMansion(slug: string): Promise<PublicMansion | null> {
  if (isPreviewMode() && slug === fixtureMansion.slug) {
    return fixtureMansion;
  }

  const sql = getSql();
  if (!sql) {
    throw new Error('DATABASE_URL is not configured; cannot serve public mansion pages');
  }

  const [mansion] = await sql<MansionRow[]>`
    SELECT id, public_id
    FROM mansions
    WHERE slug = ${slug} AND public_status = 'published' AND review_status = 'approved'
  `;

  if (!mansion) return null;

  const mansionAttrs = await sql<AttributeRow[]>`
    SELECT entity_id, attribute_name, attribute_value
    FROM entity_attribute_sources
    WHERE entity_type = 'mansion'
      AND entity_id = ${mansion.id}
      AND publication_allowed = true
  `;
  const m = new Map(mansionAttrs.map((a) => [a.attribute_name, a.attribute_value]));
  const canonicalName = getAttr(m, 'canonical_name');

  if (!canonicalName) return null;

  const buildings = await sql<BuildingRow[]>`
    SELECT id, canonical_name, building_label
    FROM buildings
    WHERE mansion_id = ${mansion.id}
      AND public_status = 'published'
      AND review_status = 'approved'
  `;

  const buildingAttrMap = new Map<string, Map<string, string | null>>();
  for (const b of buildings) buildingAttrMap.set(b.id, new Map());

  if (buildings.length > 0) {
    const buildingIds = buildings.map((b) => b.id);
    const buildingAttrs = await sql<AttributeRow[]>`
      SELECT entity_id, attribute_name, attribute_value
      FROM entity_attribute_sources
      WHERE entity_type = 'building'
        AND entity_id IN ${sql(buildingIds)}
        AND publication_allowed = true
    `;
    for (const a of buildingAttrs) {
      buildingAttrMap.get(a.entity_id)?.set(a.attribute_name, a.attribute_value);
    }
  }

  const publicBuildings: PublicBuilding[] = [];
  for (const b of buildings) {
    const attrs = buildingAttrMap.get(b.id) ?? new Map<string, string | null>();
    const name = b.canonical_name ?? b.building_label;
    if (!name) continue;
    publicBuildings.push({
      id: b.id,
      canonicalName: name,
      buildingLabel: b.building_label,
      floorsAbove: toNum(getAttr(attrs, 'floors_above')),
      floorsBelow: toNum(getAttr(attrs, 'floors_below')),
      totalUnits: toNum(getAttr(attrs, 'total_units')),
      structure: getAttr(attrs, 'structure'),
      builtYear: toNum(getAttr(attrs, 'built_year')),
      builtMonth: toNum(getAttr(attrs, 'built_month')),
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
    constructorName: getAttr(m, 'constructor'),
    managementCompany: getAttr(m, 'management_company'),
    structure: getAttr(m, 'structure'),
    mansionType: getAttr(m, 'mansion_type'),
    nearestStation: getAttr(m, 'nearest_station'),
    buildings: publicBuildings,
  };
}

export async function getPublishedMansionSlugs(): Promise<string[]> {
  if (isPreviewMode()) return [fixtureMansion.slug];

  const sql = getSql();
  if (!sql) return [];

  const rows = await sql<{ slug: string }[]>`
    SELECT slug
    FROM mansions
    WHERE public_status = 'published' AND review_status = 'approved'
    ORDER BY slug
  `;
  return rows.map((r) => r.slug);
}
