# Architecture

## 全体像

```
┌───────────────────────────────────────┐
│ Public Web (Next.js App Router)       │
│ /mansion/[slug]                       │
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Admin UI                              │
│ Match Review / Building List          │
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Canonical Layer                       │
│ buildings / building_attribute_sources│
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Matching Engine                       │
│ building_match_candidates             │
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Observation Layer                     │
│ building_observations                 │
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Raw Layer                             │
│ raw_source_records                    │
└───────────────────────────────────────┘
                   │
┌───────────────────────────────────────┐
│ Data Source Adapters                  │
│ PLATEAU / Address Base / Portal       │
└───────────────────────────────────────┘
```

## 4層データパイプライン

1. **Raw**: 外部データの生 JSON/XML/CSV/HTML をそのまま保存。外部 ID あり。
2. **Observation**: ソースごとに属性を抽出。元の文字列を保持。
3. **Canonical**: 名寄せ結果を反映した建物マスター。永続 Building ID を付与。
4. **Public**: `publication_allowed = true` の属性のみを返すビュー。SEO ページはここから取得。

## Building ID

外部サービスの ID を primary ID には使わない。
`BLD_` プレフィックス付き ULID を採用する。

- ソート可能（辞書順・時間順）。
- URL セーフ（[a-zA-Z0-9]）。
- 発行後は一切変更しない。

## 技術スタック

- Next.js App Router
- TypeScript strict
- PostgreSQL + PostGIS
- pnpm
- Vercel
- Sentry

## ポータルスクレイピング

- `PortalSourceAdapter` → `RawSourceRecord` → `BuildingObservation` → `Normalization` → `Matching Candidate` → `Canonical Building`
- 未承認サイトは `enabled = false`。
- HTML fixtures による parser テストを前提とする。
