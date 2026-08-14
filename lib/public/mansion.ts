import { getSql } from '@/lib/db';
import { isPreviewMode } from '@/lib/env';
import { fixtureMansion } from '@/lib/fixtures/pr4-mansion';
import {
  attrNumber,
  attrString,
  groupAttributeMaps,
  toAttributeMap,
  type AttributeMap,
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
}

export async function getPublicMansion(slug: string): Promise<PublicMansion | null> {
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
  const m = toAttributeMap(mansionAttrs);
  const canonicalName = attrString(m, 'canonical_name');

  if (!canonicalName) return null;

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
    const buildingAttrs = await sql`
      SELECT entity_id, attribute_name, attribute_value
      FROM entity_attribute_sources
      WHERE entity_type = 'building'
        AND entity_id IN ${sql(buildingIds)}
        AND publication_allowed = true
    `;
    buildingAttrMap = groupAttributeMaps(buildingAttrs);
  }

  const publicBuildings: PublicBuilding[] = [];
  for (const b of buildings) {
    const attrs = buildingAttrMap.get(b.id);
    if (!b.canonical_name && !b.building_label) continue;
    publicBuildings.push({
      id: b.id,
      canonicalName: b.canonical_name,
      buildingLabel: b.building_label,
      floorsAbove: attrNumber(attrs, 'floors_above'),
      floorsBelow: attrNumber(attrs, 'floors_below'),
      totalUnits: attrNumber(attrs, 'total_units'),
      structure: attrString(attrs, 'structure'),
      builtYear: attrNumber(attrs, 'built_year'),
      builtMonth: attrNumber(attrs, 'built_month'),
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
    builtYear: attrNumber(m, 'built_year'),
    builtMonth: attrNumber(m, 'built_month'),
    totalUnits: attrNumber(m, 'total_units'),
    developer: attrString(m, 'developer'),
    'constructor': attrString(m, 'constructor'),
    managementCompany: attrString(m, 'management_company'),
    structure: attrString(m, 'structure'),
    mansionType: attrString(m, 'mansion_type'),
    nearestStation: attrString(m, 'nearest_station'),
    buildings: publicBuildings,
  };
}
