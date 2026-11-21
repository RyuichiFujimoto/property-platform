import type { PublicMansion } from '@/lib/public/mansion';

export const fixtureMansion: PublicMansion = {
  id: 'MAN_FIXTURE_0000000000000001',
  publicId: 'MAN_FIXTURE_0000000000000001',
  slug: 'fixture-mansion',
  canonicalName: 'Fixture マンション（プレビュー用サンプル）',
  address: '東京都新宿区新宿1-1-1',
  ward: '新宿区',
  town: '新宿',
  builtYear: 2020,
  builtMonth: 6,
  totalUnits: 120,
  developer: 'Fixture 不動産',
  constructor: 'Fixture 建設',
  managementCompany: 'Fixture 管理',
  structure: '鉄筋コンクリート造',
  mansionType: 'tower',
  nearestStation: 'JR 新宿駅 徒歩5分',
  buildings: [
    {
      id: 'BLD_FIXTURE_0000000000000001',
      canonicalName: 'Fixture マンション',
      buildingLabel: 'A棟',
      floorsAbove: 20,
      floorsBelow: 1,
      totalUnits: 120,
      structure: '鉄筋コンクリート造',
      builtYear: 2020,
      builtMonth: 6,
    },
  ],
  isPreview: true,
};
