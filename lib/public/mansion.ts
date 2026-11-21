import { getSql } from '@/lib/db';
import { isPreviewMode } from '@/lib/env';
import { logWarn } from '@/lib/errors';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';
import {
  attrNumber,
  attrString,
  groupAttributeMaps,
  toAttributeMap,
  type AttributeMap,
  type AttributeRow,
  type EntityAttributeRow,
} from '@/lib/public/attributes';

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
  /** 架空のプレビュー用データかどうか。true のページは index させない。 */
  isPreview: boolean;
}

export interface PublicMansionIndexEntry {
  slug: string;
  updatedAt: Date | null;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

/**
 * sitemap に載せる公開マンション。
 * 公開許可された名称が無いものは公開ページ側で 404 になるため、ここでも除外する。
 */
export async function getPublicMansionIndexEntries(): Promise<PublicMansionIndexEntry[]> {
  // プレビュー環境の fixture は架空データなので sitemap に載せない。
  if (isPreviewMode()) return [];

  const sql = getSql();

  const rows = await sql`
    SELECT m.slug, m.updated_at
    FROM mansions m
    WHERE m.public_status = 'published'
      AND m.review_status = 'approved'
      AND EXISTS (
        SELECT 1
        FROM entity_attribute_sources e
        WHERE e.entity_type = 'mansion'
          AND e.entity_id = m.id
          AND e.attribute_name = 'canonical_name'
          AND e.publication_allowed = true
      )
    ORDER BY m.slug
  `;

  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at ?? null,
  }));
}

export async function getPublicMansion(slug: string): Promise<PublicMansion | null> {
  if (!SLUG_PATTERN.test(slug)) return null;

  if (slug === fixtureMansion.slug && isPreviewMode()) {
    return fixtureMansion;
  }

  const sql = getSql();

  const [mansion] = await sql`
    SELECT id, public_id, project_id, public_status, review_status
    FROM mansions
    WHERE slug = ${slug} AND public_status = 'published' AND review_status = 'approved'
  `;

  if (!mansion) return null;

  const mansionAttrs = await sql<AttributeRow[]>`
    SELECT attribute_name, attribute_value
    FROM entity_attribute_sources
    WHERE entity_type = 'mansion'
      AND entity_id = ${mansion.id}
      AND publication_allowed = true
  `;
  const m = toAttributeMap(mansionAttrs);
  const canonicalName = attrString(m, 'canonical_name');

  // 公開済みなのに公開可能な名称が無いのはデータ不整合。404 にする前に必ず記録する。
  if (!canonicalName) {
    logWarn(
      'public/mansion',
      'published mansion has no publication-allowed canonical_name, returning not found',
      { slug, mansionId: mansion.id }
    );
    return null;
  }

  const buildings = await sql`
    SELECT id, public_id, canonical_name, building_label
    FROM buildings
    WHERE mansion_id = ${mansion.id}
      AND public_status = 'published'
      AND review_status = 'approved'
  `;

  let buildingAttrMap = new Map<string, AttributeMap>();

  if (buildings.length > 0) {
    const buildingIds = buildings.map((b) => b.id);
    const buildingAttrs = await sql<EntityAttributeRow[]>`
      SELECT entity_id, attribute_name, attribute_value
      FROM entity_attribute_sources
      WHERE entity_type = 'building'
        AND entity_id IN ${sql(buildingIds)}
        AND publication_allowed = true
    `;
    const knownBuildingIds = new Set(buildingIds);
    buildingAttrMap = groupAttributeMaps(
      buildingAttrs.filter((a) => {
        if (knownBuildingIds.has(a.entity_id)) return true;
        logWarn('public/mansion', 'attribute references unknown building, dropping attribute', {
          slug,
          buildingId: a.entity_id,
          attribute: a.attribute_name,
        });
        return false;
      })
    );
  }

  const publicBuildings: PublicBuilding[] = [];
  for (const b of buildings) {
    const attrs = buildingAttrMap.get(b.id);
    if (!b.canonical_name && !b.building_label) {
      logWarn('public/mansion', 'skipping building without canonical_name and building_label', {
        slug,
        buildingId: b.id,
      });
      continue;
    }
    publicBuildings.push({
      id: b.id,
      canonicalName: b.canonical_name,
      buildingLabel: b.building_label,
      floorsAbove: attrNumber(attrs, 'floors_above', b.id),
      floorsBelow: attrNumber(attrs, 'floors_below', b.id),
      totalUnits: attrNumber(attrs, 'total_units', b.id),
      structure: attrString(attrs, 'structure'),
      builtYear: attrNumber(attrs, 'built_year', b.id),
      builtMonth: attrNumber(attrs, 'built_month', b.id),
    });
  }

  return {
    id: mansion.id,
    publicId: mansion.public_id,
    slug,
    canonicalName,
    address: attrString(m, 'address'),
    ward: attrString(m, 'ward'),
    town: attrString(m, 'town'),
    builtYear: attrNumber(m, 'built_year', mansion.id),
    builtMonth: attrNumber(m, 'built_month', mansion.id),
    totalUnits: attrNumber(m, 'total_units', mansion.id),
    developer: attrString(m, 'developer'),
    'constructor': attrString(m, 'constructor'),
    managementCompany: attrString(m, 'management_company'),
    structure: attrString(m, 'structure'),
    mansionType: attrString(m, 'mansion_type'),
    nearestStation: attrString(m, 'nearest_station'),
    buildings: publicBuildings,
    isPreview: false,
  };
}
