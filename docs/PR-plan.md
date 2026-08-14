# PR 分割計画

## PR 1 — Repository Bootstrap

- Next.js + TypeScript + pnpm プロジェクト作成
- ESLint / Prettier / Tailwind CSS 設定
- テスト環境（Vitest）
- GitHub Actions CI
- AGENTS.md / README.md / .env.example
- `.devin/environment.yaml`

## PR 2 — Database Foundation

- PostgreSQL + PostGIS 接続
- migrations
- `data_sources`
- `raw_source_records`
- `building_observations`
- `buildings`
- `building_source_links`
- `building_attribute_sources`
- `building_aliases`
- `building_match_candidates`

## PR 3 — Open Data Source Framework

- 共通 `SourceAdapter` インターフェース
- PLATEAU adapter skeleton
- Address Registry adapter skeleton
- fixtures
- tests

## PR 4 — Address / Name Normalization

- 建物名正規化
- 住所正規化
- tests

## PR 5 — Matching Engine

- candidate 生成
- スコア計算
- `AUTO_MATCH` / `REVIEW` / `NO_MATCH`
- audit trail

## PR 6 — PLATEAU Initial Import

- 東京23区のうち 1 区（中央区など）を対象
- 小規模データで pipeline 完成

## PR 7 — Admin Match Review

- 管理画面
- Match Review UI

## PR 8 — Public Building Page

- `/mansion/[slug]`

## PR 9 — SEO Foundation

- sitemap
- robots
- canonical
- redirects
- noindex policy

## PR 10 — Portal Observation Framework

- 規約承認済み source のみ有効化
- fixtures / adapter architecture
