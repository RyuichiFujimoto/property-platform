import dotenv from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ulid } from 'ulid';
import crypto from 'crypto';
import { normalizeConnectionString, sslConfigFor } from '../lib/db/connection.mjs';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const CONFIDENCE = 0.7;
const PREFECTURE = '東京都';

const sql = postgres(normalizeConnectionString(DATABASE_URL), {
  max: 1,
  ssl: sslConfigFor(DATABASE_URL),
});

const newProjectId = () => `PRJ_${ulid()}`;
const newMansionId = () => `MAN_${ulid()}`;
const newBuildingId = () => `BLD_${ulid()}`;

const dataFile = resolve(process.cwd(), 'data', 'pr3-mansions.json');
const rawPayload = JSON.parse(readFileSync(dataFile, 'utf8'));
const rawString = JSON.stringify(rawPayload);

function validatePayload(payload) {
  const errors = [];
  if (!payload.source_name) errors.push('source_name is required');
  if (!Array.isArray(payload.records)) errors.push('records must be an array');

  for (const [i, record] of (payload.records ?? []).entries()) {
    const at = `records[${i}]`;
    if (!record.mansion) {
      errors.push(`${at}.mansion is required`);
      continue;
    }
    if (!record.mansion.slug) errors.push(`${at}.mansion.slug is required`);
    if (!record.mansion.canonical_name) errors.push(`${at}.mansion.canonical_name is required`);
    if (!record.mansion.ward) errors.push(`${at}.mansion.ward is required`);
    if (record.project && !record.project.slug) errors.push(`${at}.project.slug is required`);
    if (record.buildings !== undefined && !Array.isArray(record.buildings)) {
      errors.push(`${at}.buildings must be an array`);
      continue;
    }
    for (const [j, building] of (record.buildings ?? []).entries()) {
      if (!building.canonical_name && !building.building_label) {
        errors.push(`${at}.buildings[${j}] needs canonical_name or building_label`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`invalid ${dataFile}:\n- ${errors.join('\n- ')}`);
  }
}

function attributeSources(entityType, entityId, values, sourceId, observationId) {
  const rows = [];
  for (const [attr, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    rows.push({
      entity_type: entityType,
      entity_id: entityId,
      attribute_name: attr,
      attribute_value: String(value),
      source_id: sourceId,
      observation_id: observationId,
      confidence: CONFIDENCE,
      // 公開許可は docs/data-rights.md の判定に従って別途更新する
      publication_allowed: false,
    });
  }
  return rows;
}

async function run() {
  validatePayload(rawPayload);

  const now = new Date().toISOString();
  const observedAt = rawPayload.observed_at || now.slice(0, 10);

  await sql.begin(async (tx) => {
    // 同じ調査ソースを何度も作らない（再実行可能にする）
    const [existingSource] = await tx`
      SELECT id FROM data_sources WHERE name = ${rawPayload.source_name} LIMIT 1
    `;
    const sourceId =
      existingSource?.id ??
      (
        await tx`
          INSERT INTO data_sources (name, source_type, acquisition_method, terms_status, publication_status, commercial_use_status, created_at, updated_at)
          VALUES (${rawPayload.source_name}, 'manual', ${rawPayload.acquisition_method}, 'pending_review', 'not_allowed', 'restricted', ${now}, ${now})
          RETURNING id
        `
      )[0].id;

    const contentHash = crypto.createHash('sha256').update(rawString).digest('hex');
    // Raw 層は追記のみ。同一内容が既にあれば再利用する
    const [existingRaw] = await tx`
      SELECT id FROM raw_source_records
      WHERE source_id = ${sourceId} AND content_hash = ${contentHash}
      LIMIT 1
    `;
    const rawRecordId =
      existingRaw?.id ??
      (
        await tx`
          INSERT INTO raw_source_records (source_id, external_id, raw_payload, content_hash, observed_at, created_at)
          VALUES (${sourceId}, 'data/pr3-mansions.json', ${rawPayload}, ${contentHash}, ${observedAt}, ${now})
          RETURNING id
        `
      )[0].id;

    const allAttributeSources = [];
    const touchedEntities = [];

    for (const record of rawPayload.records) {
      let projectId = null;

      if (record.project) {
        const project = record.project;
        const [projectObs] = await tx`
          INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, source_url, observed_at, raw_source_record_id, created_at)
          VALUES (${sourceId}, ${project.slug}, 'project', ${project.canonical_name}, ${project.address_summary}, null, ${observedAt}, ${rawRecordId}, ${now})
          RETURNING id
        `;

        const [existingProject] = await tx`
          SELECT id FROM projects WHERE slug = ${project.slug} LIMIT 1
        `;
        projectId = existingProject?.id ?? newProjectId();

        await tx`
          INSERT INTO projects (id, public_id, canonical_name, slug, prefecture, city, ward, address_summary, public_status, review_status, created_at, updated_at)
          VALUES (${projectId}, ${projectId}, ${project.canonical_name}, ${project.slug}, ${PREFECTURE}, ${project.ward}, ${project.ward}, ${project.address_summary}, 'draft', 'pending', ${now}, ${now})
          ON CONFLICT (id) DO UPDATE SET
            canonical_name = EXCLUDED.canonical_name,
            prefecture = EXCLUDED.prefecture,
            city = EXCLUDED.city,
            ward = EXCLUDED.ward,
            address_summary = EXCLUDED.address_summary,
            updated_at = EXCLUDED.updated_at
        `;

        touchedEntities.push(['project', projectId]);
        allAttributeSources.push(
          ...attributeSources(
            'project',
            projectId,
            {
              canonical_name: project.canonical_name,
              slug: project.slug,
              ward: project.ward,
              address_summary: project.address_summary,
            },
            sourceId,
            projectObs.id
          )
        );
      }

      const mansion = record.mansion;
      const [mansionObs] = await tx`
        INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, built_year, built_month, total_units, source_url, observed_at, raw_source_record_id, created_at)
        VALUES (${sourceId}, ${mansion.slug}, 'mansion', ${mansion.canonical_name}, ${mansion.address}, ${mansion.built_year}, ${mansion.built_month}, ${mansion.total_units}, null, ${observedAt}, ${rawRecordId}, ${now})
        RETURNING id
      `;

      const [existingMansion] = await tx`
        SELECT id FROM mansions WHERE slug = ${mansion.slug} LIMIT 1
      `;
      const mansionId = existingMansion?.id ?? newMansionId();

      await tx`
        INSERT INTO mansions (id, public_id, project_id, canonical_name, slug, prefecture, city, ward, town, address, built_year, built_month, total_units, developer, constructor, management_company, mansion_type, public_status, review_status, confidence_score, created_at, updated_at)
        VALUES (
          ${mansionId}, ${mansionId}, ${projectId}, ${mansion.canonical_name}, ${mansion.slug},
          ${PREFECTURE}, ${mansion.ward}, ${mansion.ward}, ${mansion.town ?? null}, ${mansion.address},
          ${mansion.built_year}, ${mansion.built_month}, ${mansion.total_units},
          ${mansion.developer}, ${mansion.constructor}, ${mansion.management_company},
          ${mansion.mansion_type}, 'draft', 'pending', ${CONFIDENCE}, ${now}, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          project_id = EXCLUDED.project_id,
          canonical_name = EXCLUDED.canonical_name,
          prefecture = EXCLUDED.prefecture,
          city = EXCLUDED.city,
          ward = EXCLUDED.ward,
          town = EXCLUDED.town,
          address = EXCLUDED.address,
          built_year = EXCLUDED.built_year,
          built_month = EXCLUDED.built_month,
          total_units = EXCLUDED.total_units,
          developer = EXCLUDED.developer,
          constructor = EXCLUDED.constructor,
          management_company = EXCLUDED.management_company,
          mansion_type = EXCLUDED.mansion_type,
          confidence_score = EXCLUDED.confidence_score,
          updated_at = EXCLUDED.updated_at
      `;

      touchedEntities.push(['mansion', mansionId]);
      allAttributeSources.push(
        ...attributeSources(
          'mansion',
          mansionId,
          {
            canonical_name: mansion.canonical_name,
            slug: mansion.slug,
            prefecture: PREFECTURE,
            city: mansion.ward,
            ward: mansion.ward,
            town: mansion.town,
            address: mansion.address,
            built_year: mansion.built_year,
            built_month: mansion.built_month,
            total_units: mansion.total_units,
            developer: mansion.developer,
            constructor: mansion.constructor,
            management_company: mansion.management_company,
            mansion_type: mansion.mansion_type,
            nearest_station: mansion.nearest_station,
            structure: mansion.structure,
          },
          sourceId,
          mansionObs.id
        )
      );

      for (const building of record.buildings ?? []) {
        const [buildingObs] = await tx`
          INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, building_label, floors_above, floors_below, total_units, structure, built_year, built_month, observed_at, raw_source_record_id, created_at)
          VALUES (${sourceId}, ${building.building_label}, 'building', ${building.canonical_name}, ${building.address}, ${building.building_label}, ${building.floors_above}, ${building.floors_below}, ${building.total_units}, ${building.structure}, ${building.built_year}, ${building.built_month}, ${observedAt}, ${rawRecordId}, ${now})
          RETURNING id
        `;

        const [existingBuilding] = await tx`
          SELECT id FROM buildings
          WHERE mansion_id = ${mansionId}
            AND building_label IS NOT DISTINCT FROM ${building.building_label ?? null}
          LIMIT 1
        `;
        const buildingId = existingBuilding?.id ?? newBuildingId();

        await tx`
          INSERT INTO buildings (id, public_id, mansion_id, canonical_name, building_label, built_year, built_month, floors_above, floors_below, total_units, structure, public_status, review_status, confidence_score, created_at, updated_at)
          VALUES (
            ${buildingId}, ${buildingId}, ${mansionId}, ${building.canonical_name}, ${building.building_label},
            ${building.built_year}, ${building.built_month}, ${building.floors_above}, ${building.floors_below},
            ${building.total_units}, ${building.structure}, 'draft', 'pending', ${CONFIDENCE}, ${now}, ${now}
          )
          ON CONFLICT (id) DO UPDATE SET
            canonical_name = EXCLUDED.canonical_name,
            building_label = EXCLUDED.building_label,
            built_year = EXCLUDED.built_year,
            built_month = EXCLUDED.built_month,
            floors_above = EXCLUDED.floors_above,
            floors_below = EXCLUDED.floors_below,
            total_units = EXCLUDED.total_units,
            structure = EXCLUDED.structure,
            confidence_score = EXCLUDED.confidence_score,
            updated_at = EXCLUDED.updated_at
        `;

        touchedEntities.push(['building', buildingId]);
        allAttributeSources.push(
          ...attributeSources(
            'building',
            buildingId,
            {
              canonical_name: building.canonical_name,
              building_label: building.building_label,
              built_year: building.built_year,
              built_month: building.built_month,
              floors_above: building.floors_above,
              floors_below: building.floors_below,
              total_units: building.total_units,
              structure: building.structure,
            },
            sourceId,
            buildingObs.id
          )
        );
      }
    }

    // このソース由来の来歴は毎回置き換える（再実行で重複しない）
    for (const [entityType, entityId] of touchedEntities) {
      await tx`
        DELETE FROM entity_attribute_sources
        WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND source_id = ${sourceId}
      `;
    }

    if (allAttributeSources.length > 0) {
      await tx`
        INSERT INTO entity_attribute_sources ${tx(allAttributeSources, 'entity_type', 'entity_id', 'attribute_name', 'attribute_value', 'source_id', 'observation_id', 'confidence', 'publication_allowed')}
      `;
    }

    console.log(
      `PR3 seed: ${rawPayload.records.length} records, ${allAttributeSources.length} attribute sources`
    );
  });

  console.log('PR3 seed completed');
}

try {
  await run();
} catch (err) {
  console.error('PR3 seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
