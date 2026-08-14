# PR 分割計画

## PR 1 — Repository Bootstrap (already done)

- Next.js + TypeScript + pnpm プロジェクト作成
- ESLint / Prettier / Tailwind CSS 設定
- テスト環境（Vitest）
- GitHub Actions CI
- AGENTS.md / README.md / .env.example
- `.devin/environment.yaml`

## PR 2 — Canonical Data Model

- projects / mansions / buildings / units テーブル
- data_sources
- raw_source_records / source_observations
- provenance (`entity_attribute_sources`)
- マイグレーション
- ULID ID 体系 (`PRJ_`, `MAN_`, `BLD_`, `UNT_`)

## PR 3 — Minimal Real Data Pipeline

- 3-5 real mansions, including at least one multi-building
- end-to-end: source → raw → observation → canonical
- PLATEAU / Address Base / open data integration

## PR 4 — Public Mansion SEO Vertical Slice

- `/mansion/[slug]`
- mansion data, market section, CTA
- responsive design
- noindex / publication_allowed guard

## PR 5 — Owner Authentication & Registration

- Supabase Auth
- select Mansion / Building
- enter unit info (room, floor, area, layout, direction)
- owner_properties 作成

## PR 6 — My Mansion

- `/mypage`
- estimated price, price range, price per tsubo
- month-over-month, mansion price trend, recent listings

## PR 7 — Appraisal Request & Admin

- appraisal request form
- admin: owner leads, appraisal requests
- status workflow (new / contacted / appointment / closed)

## PR 8 — MVP 50 Mansion Data Import

- 50 real mansions in Tokyo 23 wards, including Setagaya
- import pipeline and review

## PR 9 — SEO / Analytics / Setagaya Area Page

- sitemap / robots / canonical
- Setagaya area page
- analytics / event tracking

## PR 10+ — Post-MVP

- advanced matching
- 23-wide import
- portal scraping (after legal approval)
- property graph
- advanced market data
- R2 storage integration
