# Matching Engine

Mansion と Building の名寄せは分離して行います。
SEO・ユーザー向けの `Mansion` と、物理・GIS 向けの `Building` では属性と情報源が異なるため、それぞれ独立した matching ロジックを持ちます。

## 共通原則

- deterministic + scoring 方式
- 住所、位置、名称、竣工年、総戸数などを使用
- スコア値は config 化し、固定値決め打ちにしない
- 結果は `AUTO_MATCH` / `REVIEW` / `NO_MATCH` に分類する
- すべての match についてスコア内訳を保存する

## Mansion Matching

 Mansion 同士を名寄せする際に使用します。 観測元の名称、住所構成要素、位置、デベロッパー／ブランド、開発プロジェクトとの紐づけを考慮します。

### スコアリング初期案

```ts
const mansionScoring = {
  exactNormalizedName: 40,
  addressBlockMatch: 25,
  nearGeo: 20,          // 50m 以内
  projectMatch: 10,     // 同一開発・ブランド
  developerMatch: 5,
};
```

### 判定閾値

| 合計スコア | 判定 |
| --- | --- |
| 80 以上 | `AUTO_MATCH` |
| 45 以上 80 未満 | `REVIEW` |
| 45 未満 | `NO_MATCH` |

## Building Matching

Building 同士を名寄せする際に使用します。 棟名（A棟 / Tower 1 等）、位置、竣工年、階数、総戸数、構造を重視します。

### スコアリング初期案

```ts
const buildingScoring = {
  exactBuildingLabel: 35,
  nearGeo: 25,          // 20m 以内
  addressMatch: 15,
  builtYear: 10,
  floors: 5,
  totalUnits: 5,
  structure: 5,
};
```

### 判定閾値

| 合計スコア | 判定 |
| --- | --- |
| 85 以上 | `AUTO_MATCH` |
| 50 以上 85 未満 | `REVIEW` |
| 50 未満 | `NO_MATCH` |

## 正規化

- 住所：全角/半角、数字表記、丁目/番地/号を正規化。original は保持。
- Mansion / Building 名：Unicode NFKC、全角半角、空白、ケース、句読点を正規化。original は保持。
- 緯度経度：PostGIS で距離計算。

## 審査フロー

1. `source_observations` から Mansion / Building の観測を投入。
2. `MatchingEngine` が candidate を生成し、`mansion_match_candidates` / `building_match_candidates` へ保存。
3. `AUTO_MATCH` は自動で canonical テーブルへ merge 可能（config 次第）。
4. `REVIEW` は Admin UI で人間が判断。
5. `NO_MATCH` は新規 Mansion / Building 作成候補として表示。
