import { ulid } from 'ulid';
import { getSql } from '@/lib/db';
import type { OwnerPropertyInput, UnitDirection } from '@/lib/owner/validation';

export interface OwnerProperty {
  id: string;
  mansionId: string;
  buildingId: string | null;
  roomNumber: string | null;
  floor: number | null;
  areaSqm: number | null;
  layout: string | null;
  direction: UnitDirection | null;
  registeredAt: string | null;
}

export function newOwnerPropertyId(): string {
  return `OWP_${ulid()}`;
}

interface OwnerPropertyRow {
  id: string;
  mansion_id: string;
  building_id: string | null;
  room_number: string | null;
  floor: number | null;
  area_sqm: string | number | null;
  layout: string | null;
  direction: string | null;
  registered_at: Date | string | null;
}

function toOwnerProperty(row: OwnerPropertyRow): OwnerProperty {
  const area = row.area_sqm === null ? null : Number(row.area_sqm);
  return {
    id: row.id,
    mansionId: row.mansion_id,
    buildingId: row.building_id,
    roomNumber: row.room_number,
    floor: row.floor === null ? null : Number(row.floor),
    areaSqm: area === null || Number.isNaN(area) ? null : area,
    layout: row.layout,
    direction: (row.direction as UnitDirection | null) ?? null,
    registeredAt:
      row.registered_at instanceof Date
        ? row.registered_at.toISOString()
        : (row.registered_at ?? null),
  };
}

export type InsertOwnerPropertyResult =
  | { status: 'created'; property: OwnerProperty }
  | { status: 'duplicate' }
  | { status: 'unavailable' };

/**
 * DB 未接続時は 'unavailable' を返す（`getSql()` と同じ lazy 方針）。
 * 同じ部屋が既に登録済みなら unique index により 'duplicate'。
 */
export async function insertOwnerProperty(
  userId: string,
  input: OwnerPropertyInput,
): Promise<InsertOwnerPropertyResult> {
  const sql = getSql();
  if (!sql) return { status: 'unavailable' };

  const rows = await sql<OwnerPropertyRow[]>`
    INSERT INTO owner_properties (
      id, user_id, mansion_id, building_id, room_number, floor, area_sqm, layout, direction
    ) VALUES (
      ${newOwnerPropertyId()},
      ${userId},
      ${input.mansionId},
      ${input.buildingId},
      ${input.roomNumber},
      ${input.floor},
      ${input.areaSqm},
      ${input.layout},
      ${input.direction}
    )
    ON CONFLICT DO NOTHING
    RETURNING id, mansion_id, building_id, room_number, floor, area_sqm, layout, direction, registered_at
  `;

  const row = rows[0];
  return row ? { status: 'created', property: toOwnerProperty(row) } : { status: 'duplicate' };
}

export async function listOwnerProperties(userId: string): Promise<OwnerProperty[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql<OwnerPropertyRow[]>`
    SELECT id, mansion_id, building_id, room_number, floor, area_sqm, layout, direction, registered_at
    FROM owner_properties
    WHERE user_id = ${userId}
    ORDER BY registered_at DESC
  `;

  return rows.map(toOwnerProperty);
}

export async function countOwnerProperties(userId: string): Promise<number> {
  const sql = getSql();
  if (!sql) return 0;

  const [row] = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM owner_properties WHERE user_id = ${userId}
  `;

  return row ? Number(row.count) : 0;
}
