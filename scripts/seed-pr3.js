import dotenv from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ulid } from 'ulid';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

let connectionString = DATABASE_URL;
if (connectionString.startsWith('postgresql://')) {
  const rest = connectionString.slice('postgresql://'.length);
  const atIndex = rest.lastIndexOf('@');
  if (atIndex > 0) {
    const userInfo = rest.slice(0, atIndex);
    const hostPart = rest.slice(atIndex + 1);
    const colonIndex = userInfo.indexOf(':');
    if (colonIndex > 0) {
      const user = userInfo.slice(0, colonIndex);
      const password = userInfo.slice(colonIndex + 1);
      connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}`;
    }
  }
}

const sql = postgres(connectionString, {
  max: 1,
  ssl: { rejectUnauthorized: false },
});

const newProjectId = () => `PRJ_${ulid()}`;
const newMansionId = () => `MAN_${ulid()}`;
const newBuildingId = () => `BLD_${ulid()}`;

const dataFile = resolve(process.cwd(), 'data', 'pr3-mansions.json');
const rawPayload = JSON.parse(readFileSync(dataFile, 'utf8'));
const rawString = JSON.stringify(rawPayload);

function attributeSources(entityType, entityId, values, sourceId, observationId) {
  const rows = [];
  for (const [attr, value] of Object.entries(values)) {
    if (value === undefined) continue;
    rows.push({
      entity_type: entityType,
      entity_id: entityId,
      attribute_name: attr,
      attribute_value: value === null ? null : String(value),
      source_id: sourceId,
      observation_id: observationId,
      confidence: 0.7,
      publication_allowed: false,
    });
  }
  return rows;
}

async function run() {
  const now = new Date().toISOString();
  const observedAt = rawPayload.observed_at || now.slice(0, 10);

  await sql.begin(async (sql) => {
    const [source] = await sql`
      INSERT INTO data_sources (name, source_type, acquisition_method, terms_status, publication_status, commercial_use_status, created_at, updated_at)
      VALUES (${rawPayload.source_name}, 'manual', ${rawPayload.acquisition_method}, 'pending_review', 'not_allowed', 'restricted', ${now}, ${now})
      RETURNING id
    `;
    const sourceId = source.id;

    const contentHash = crypto.createHash('sha256').update(rawString).digest('hex');
    const [raw] = await sql`
      INSERT INTO raw_source_records (source_id, external_id, raw_payload, content_hash, observed_at, created_at)
      VALUES (${sourceId}, 'data/pr3-mansions.json', ${rawPayload}, ${contentHash}, ${observedAt}, ${now})
      RETURNING id
    `;
    const rawRecordId = raw.id;

    const allAttributeSources = [];

    for (const record of rawPayload.records) {
      let projectId = null;

      if (record.project) {
        projectId = newProjectId();
        const project = record.project;
        const [projectObs] = await sql`
          INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, source_url, observed_at, raw_source_record_id, created_at)
          VALUES (${sourceId}, ${project.slug}, 'project', ${project.canonical_name}, ${project.address_summary}, null, ${observedAt}, ${rawRecordId}, ${now})
          RETURNING id
        `;
        const projectObsId = projectObs.id;

        await sql`
          INSERT INTO projects (id, public_id, canonical_name, slug, prefecture, city, ward, address_summary, public_status, review_status, created_at, updated_at)
          VALUES (${projectId}, ${projectId}, ${project.canonical_name}, ${project.slug}, '東京都', '東京都', ${project.ward}, ${project.address_summary}, 'draft', 'pending', ${now}, ${now})
        `;

        allAttributeSources.push(
          ...attributeSources('project', projectId, {
            canonical_name: project.canonical_name,
            slug: project.slug,
            ward: project.ward,
            address_summary: project.address_summary,
          }, sourceId, projectObsId)
        );
      }

      const mansion = record.mansion;
      const mansionId = newMansionId();
      const [mansionObs] = await sql`
        INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, building_label, built_year, total_units, source_url, observed_at, raw_source_record_id, created_at)
        VALUES (${sourceId}, ${mansion.slug}, 'mansion', ${mansion.canonical_name}, ${mansion.address}, null, ${mansion.built_year}, ${mansion.total_units}, null, ${observedAt}, ${rawRecordId}, ${now})
        RETURNING id
      `;
      const mansionObsId = mansionObs.id;

      await sql`
        INSERT INTO mansions (id, public_id, project_id, canonical_name, slug, prefecture, city, ward, town, address, built_year, built_month, total_units, developer, constructor, management_company, mansion_type, public_status, review_status, confidence_score, created_at, updated_at)
        VALUES (
          ${mansionId}, ${mansionId}, ${projectId}, ${mansion.canonical_name}, ${mansion.slug},
          '東京都', '東京都', ${mansion.ward}, ${mansion.town || null}, ${mansion.address},
          ${mansion.built_year}, ${mansion.built_month}, ${mansion.total_units},
          ${mansion.developer}, ${mansion.constructor}, ${mansion.management_company},
          ${mansion.mansion_type}, 'draft', 'pending', 0.7, ${now}, ${now}
        )
      `;

      allAttributeSources.push(
        ...attributeSources('mansion', mansionId, {
          canonical_name: mansion.canonical_name,
          slug: mansion.slug,
          prefecture: '東京都',
          city: '東京都',
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
        }, sourceId, mansionObsId)
      );

      for (const building of record.buildings) {
        const buildingId = newBuildingId();
        const [buildingObs] = await sql`
          INSERT INTO source_observations (source_id, external_id, entity_type, canonical_name, address, building_label, floors_above, floors_below, total_units, structure, built_year, observed_at, raw_source_record_id, created_at)
          VALUES (${sourceId}, ${building.building_label}, 'building', ${building.canonical_name}, ${building.address}, ${building.building_label}, ${building.floors_above}, ${building.floors_below}, ${building.total_units}, ${building.structure}, ${building.built_year}, ${observedAt}, ${rawRecordId}, ${now})
          RETURNING id
        `;
        const buildingObsId = buildingObs.id;

        await sql`
          INSERT INTO buildings (id, public_id, mansion_id, canonical_name, building_label, built_year, built_month, floors_above, floors_below, total_units, structure, public_status, review_status, confidence_score, created_at, updated_at)
          VALUES (
            ${buildingId}, ${buildingId}, ${mansionId}, ${building.canonical_name}, ${building.building_label},
            ${building.built_year}, ${building.built_month}, ${building.floors_above}, ${building.floors_below},
            ${building.total_units}, ${building.structure}, 'draft', 'pending', 0.7, ${now}, ${now}
          )
        `;

        allAttributeSources.push(
          ...attributeSources('building', buildingId, {
            canonical_name: building.canonical_name,
            building_label: building.building_label,
            built_year: building.built_year,
            built_month: building.built_month,
            floors_above: building.floors_above,
            floors_below: building.floors_below,
            total_units: building.total_units,
            structure: building.structure,
          }, sourceId, buildingObsId)
        );
      }
    }

    if (allAttributeSources.length > 0) {
      await sql`
        INSERT INTO entity_attribute_sources ${sql(allAttributeSources, 'entity_type', 'entity_id', 'attribute_name', 'attribute_value', 'source_id', 'observation_id', 'confidence', 'publication_allowed')}
      `;
    }
  });

  console.log('PR3 seed completed');
  await sql.end();
}

run().catch((err) => {
  console.error('PR3 seed failed:', err);
  process.exitCode = 1;
});
