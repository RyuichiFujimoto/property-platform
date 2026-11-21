import { ulid } from 'ulid';

/**
 * 永続 ID は `<PREFIX>_<ULID>` 形式で生成する。
 *
 * @param {string} prefix
 * @returns {() => string}
 */
export function idFactory(prefix) {
  return () => `${prefix}_${ulid()}`;
}

export const newProjectId = idFactory('PRJ');
export const newMansionId = idFactory('MAN');
export const newBuildingId = idFactory('BLD');
