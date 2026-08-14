# Matching Engine

## 方針

- deterministic + scoring 方式。
- 住所、位置、建物名、竣工年、階数、総戸数を用いる。
- スコア値は config 化し、固定値決め打ちにしない。
- 結果は `AUTO_MATCH` / `REVIEW` / `NO_MATCH` に分類する。
- すべての match についてスコア内訳を保存する。

## スコアリング初期案

```ts
const defaultScoring = {
  exactAddress: 50,
  nearGeo: 25,           // 20m 以内
  nameSimilarity: 20,    // 0-20 の正規化済み類似度
  builtYear: 5,          // 一致で加点
  floors: 3,             // 一致で加点
  totalUnits: 3,         // 一致で加点
};
```

## 判定閾値

| 合計スコア | 判定 |
| --- | --- |
| 85 以上 | `AUTO_MATCH` |
| 50 以上 85 未満 | `REVIEW` |
| 50 未満 | `NO_MATCH` |

閾値は `matching_config` テーブル等で運用調整可能とする。

## 正規化

- 住所：全角/半角、数字表記、丁目/番地/号を正規化。original は保持。
- 建物名：Unicode NFKC、全角半角、空白、ケース、句読点を正規化。original は保持。
- 緯度経度：PostGIS で距離計算。

## 審査フロー

1. `BuildingObservation` を投入。
2. `MatchingEngine` が candidate を生成し `building_match_candidates` へ保存。
3. `AUTO_MATCH` は自動で `buildings` へ merge 可能（config 次第）。
4. `REVIEW` は Admin UI で人間が判断。
5. `NO_MATCH` は新規建物作成候補として表示。
