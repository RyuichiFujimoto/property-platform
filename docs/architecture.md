# Architecture

## Product concept

マイマンション（My Mansion）は、マンションオーナーが自宅の資産価値を継続的に追跡するサービスです。

- パブリックなマンションページの主な CTA は「マイマンションに登録して、今の価格を確認」です。
- 査定依頼は後段のコンバージョンであり、UI で「今すぐ売る」「即査定」を強調しません。

## Entity model: 4 layers

```
Project → Mansion → Building → Unit
```

| 層 | 例 | 役割 |
| --- | --- | --- |
| Project | HARUMI FLAG、パークタワー勝どき | 大規模開発・ディストリクト・ブランド |
| Mansion | パークタワー勝どきミッド、HARUMI FLAG SUN VILLAGE | 市場・SEO・ユーザー向けマンション単位 |
| Building | HARUMI FLAG SUN VILLAGE A棟 | 物理的な建物・タワー |
| Unit | SUN VILLAGE A棟 1203号室 | 実在する住戸 |

### 分離の原則

- **SEO primary entity**: `Mansion`。パブリック URL は `/mansion/` 配下の階層です。
- **Physical / GIS entity**: `Building`。PLATEAU 等の地理データをここに接続します。
- **Owner asset entity**: `Unit`。オーナーは 1 つの Unit をマイマンションに登録します。
- **Project**: 内部 canonical entity。省略可能です。単一建物の Mansion には多くの場合 Project は紐づきません。ユーザー向け URL では Project は `/mansion/[project_slug]` として表示します。

### リレーション

- `Project 1:N Mansion`（任意）
- `Mansion 1:N Building`
- `Building 1:N Unit`
- `Mansion 1:N Unit` も存在可能（Building 未特定時）

## ID scheme

外部サービスの ID を canonical primary ID には使いません。ULID に種別プレフィックスを付与します。

- Project: `PRJ_01J...`
- Mansion: `MAN_01J...`
- Building: `BLD_01J...`
- Unit: `UNT_01J...`

ULID は辞書順・時間順でソートでき、URL セーフで、発行後は不変です。

## 4-layer data pipeline

1. **Raw**: 外部データの生 JSON/XML/CSV/HTML をそのまま保存。外部 ID あり。
2. **Observation**: ソースごとに属性を抽出。元の文字列を保持。
3. **Canonical**: 名寄せ・検証後の Project / Mansion / Building / Unit マスター。永続 ID を付与。
4. **Public**: `publication_allowed = true` の属性のみを返すビュー。パブリックページと SEO ページはここから取得。

主要属性の来歴（provenance）は `entity_attribute_sources` で追跡します。

## My Mansion flow

1. パブリック Mansion ページの CTA: 「マイマンションに登録して、今の価格を確認」
2. Mansion を選択（複数 Building がある場合は Building も選択）
3. 住戸情報を入力: room number, floor, area, layout, direction
4. オーナー登録 / ログイン（Supabase Auth）
5. マイページ `/mypage` で推定価格、価格帯、坪単価、前月比、マンション価格トレンド、最新募集を表示
6. CTA: 「より正確な売却価格を知る」
7. 査定依頼フォーム: 売却タイムライン、売却理由、コメント
8. 管理画面でオーナーリードと査定依頼を閲覧

## System overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Public Web (Next.js App Router)                                              │
│ /mansion/[project] /mansion/[project]/[mansion] /mansion/[project]/[mansion]/[building] │
│ /mypage /area/[area] /mansion/[mansion]（Project なし） ...                  │
└──────────────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Admin UI                                                     │
│ Match Review / Owner Leads / Appraisal Requests              │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Canonical Layer                                              │
│ projects / mansions / buildings / units                      │
│ entity_attribute_sources                                     │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Matching Engine                                              │
│ mansion_match_candidates / building_match_candidates         │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Observation Layer                                            │
│ market_observations / property_listings / source_observations│
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Raw Layer                                                    │
│ raw_source_records                                           │
└──────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────────────────────────────────────┐
│ Data Source Adapters                                         │
│ PLATEAU / Address Base / GSI / Real Estate Library           │
│ Portal scrapers (fixtures only until approved)               │
└──────────────────────────────────────────────────────────────┘
```

## Tech stack

- Next.js App Router
- TypeScript strict
- PostgreSQL + PostGIS
- pnpm
- Vercel
- Sentry
- Supabase Auth
