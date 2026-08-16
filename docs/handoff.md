# Devin Session Handoff Document

このドキュメントは、新しい Devin Session が作業を正確に再開するために作成されました。過去の会話を参照できない前提で読めることを目指しています。

---

## 1. Project Goal

### 最終的に実現しようとしていること

不動産オーナー向けのマンション資産価値確認サービスの MVP。

- 東京 23 区のマンションを対象に、まずは 50 マンションを Canonical Data として構築する。
- 最重要ユーザーフロー：
  1. マンション個別 SEO ページに訪問
  2. マイマンション登録（オーナー認証）
  3. 自宅の推定価格・相場情報の確認
  4. 査定依頼
- 「不動産を売るための査定サイト」ではなく、オーナーが「自宅の資産価値を継続的に確認するサービス」。
- UI では「今すぐ売却」を過度に強調しない。

### 今回のタスクの目的

PR5「Owner Authentication & マイマンション登録」の実装。

### 完了条件（Definition of Done）

- Supabase Auth を使ったオーナー認証
- Mansion / Building / Unit（部屋番号）を選択して「マイマンション」登録
- 登録情報を `owner_properties` 等に保存
- 登録後に My Mansion ダッシュボード（PR6）へ繋ぐ土台

---

## 2. Current Status

### 完了済み

- PR1: プロジェクト骨格、AGENTS.md、README、CI、Supabase 環境
- PR2: Canonical Data Model（migrations / schema）
- PR3: 5 マンションの Real Data Pipeline（Project / Mansion / Building の Canonical 化、Source 来歴付き）
- PR4: Public Mansion SEO Page（UI / ルーティング / SEO / データ取得ロジック）
- CI 修正：`lib/db/index.ts` を lazy 化し、`.env.local` が無くてもビルドが通る
- Supabase Auth 用ライブラリ追加 + `lib/auth/supabase.ts` 作成
- PR5: オーナー認証（メール + パスワード）とマイマンション登録の実装（`/register`、`lib/owner/*`、`002_auth_and_owner.sql`）

### 正常に動作しているもの

- `pnpm lint` OK
- `pnpm typecheck` OK
- `pnpm build` OK（`.env.local` あり / なし 両方）
- `pnpm test` OK（vitest smoke test）
- GitHub Actions `ci` ワークフロー 成功
- DB への `scripts/seed-pr3.js` 実行済み

### 未完成・未検証のもの

- PR6: My Mansion（推定価格 / 相場）
- PR7: 査定依頼 & Admin
- PR8: MVP 50 Mansion Data Import
- PR9: SEO / Analytics / Area Page

### 現在作業途中のもの

- PR5「Owner Authentication & マイマンション登録」
  - `@supabase/ssr`、`@supabase/supabase-js` インストール済み
  - `lib/auth/supabase.ts` に 3 種類のクライアント作成済み
  - `/register` ページ、server action、`owner_properties` 保存を実装済み（`lib/owner/actions.ts` / `lib/owner/queries.ts` / `lib/owner/validation.ts`）
  - 未実施：Supabase 認証情報と DB 接続がある環境での通し確認（実ユーザー作成 → `owner_properties` 保存）
  - ローカル / CI には Supabase の認証情報が無いため、`/register` は「登録機能は準備中」表示にフォールバックする

---

## 3. Requirements

### ユーザーから明示された要件

1. **重要ユーザーフロー**: マンション個別 SEO ページ → マイマンション登録 → 自宅の推定価格・相場 → 査定依頼
2. **Product 思想**: マンションオーナーが自宅資産価値を継続的に確認するサービス。売却査定サイトではない。
3. **UI/IA ベンチマーク**: 三井のリハウス「マンションライブラリー」、ノムコム「マンションデータPlus」の構造・UX を参考（コピー禁止）
4. **Canonical Entity Model**: `Project → Mansion → Building → Unit` の 4 階層
   - SEO Entity = Mansion
   - Physical / GIS Entity = Building
   - Owner Asset Entity = Unit
5. **Public URL 方針**: `/mansion/<mansion-slug>` 配下に統一。Project 相当の親ページも `/mansion/` 配下。
6. **データ権利を厳格に維持**: `publication_allowed = true` の属性のみ本番表示。`noindex` は index 制御であってデータ公開可否の代替ではない。
7. **PR4 Acceptance Criteria**:「`publication_allowed=true` になった Mansion を安全に公開できる SEO Page の実装完了」
8. **PR5**: Supabase Auth を使ったオーナー認証とマイマンション登録
9. **属性単位のデータ権利**: Source 全体をまとめて `publication_allowed = true` にしない。属性ごとに判断。

### 後から追加・変更された要件

- PR3 後、5 マンションは `publication_allowed = false` で内部 Canonical 化のみ、Public ページは `noindex` でもデータ非表示。
- CI 失敗後、`lib/db/index.ts` lazy 化により `.env.local` 無しでもビルド可能に。

### 絶対に変更してはいけない仕様

- `publication_allowed = false` の属性を本番 Public ページに表示しない。
- 法務・利用規約・ライセンス上の公開可否が未確認の属性を `publication_allowed = true` に変更しない。
- 架空の市場データを表示しない。
- `Project → Mansion → Building → Unit` の 4 階層を崩さない。
- PLATEAU 地物数をそのまま Canonical Building 数として採用しない。

### UI/UX 上の要件

- マンション詳細ページに「マイマンションに登録して、今の価格を確認」CTA
- Public ページは SEO 構造（`metadata`, `openGraph`, `JSON-LD`, `canonical`）
- 「今すぐ売却」を過度に強調しない

### データ・API・DB 上の要件

- PostgreSQL + PostGIS（Supabase）
- `raw_source_records` → `source_observations` → `canonical` テーブル（projects / mansions / buildings / units）
- `entity_attribute_sources` で属性単位の来歴と `publication_allowed` を管理
- `public_status` / `review_status` で公開制御
- Supabase Auth でユーザー認証

### エッジケース

- 本番では `publication_allowed=true` 属性が不足する Mansion は 404 / sitemap 非表示。
- 開発・Preview では fixture または明確にテスト用のデータを表示。
- Building 数が実際と不一致の場合は `review_status = 'pending'` のまま残す（HARUMI FLAG SUN VILLAGE）。

---

## 4. Architecture / Design Decisions

### 4 階層 Canonical Model

- **何を決めたか**: `Project → Mansion → Building → Unit` に分離。
- **なぜか**: SEO・物理・所有者資産で異なるライフサイクルを持つため。
- **今後変更すると問題になるポイント**: Public URL、`/mansion/[slug]` ルーティング、`sitemap` 生成。

### Public URL 方針

- **何を決めたか**: 内部で Project/Mansion/Building を分離しつつ、ユーザー向け URL は `/mansion/<mansion-slug>` 統一。
- **なぜか**: ユーザーには `Project` という概念を表立たせない。親ページも `/mansion/` 配下。

### データ権利と公開制御

- **何を決めたか**: `publication_allowed` を属性単位で管理。Production 表示は `publication_allowed = true` の属性に限定。
- **なぜか**: 法務・利用規約上の安全な公開のため。
- **採用しなかった代替案**: noindex ページに `publication_allowed=false` 属性を表示（却下）。

### DB クライアント lazy 化

- **何を決めたか**: `lib/db/index.ts` で `getSql()` を export し、必要時にクライアントを生成。
- **なぜか**: CI（`.env.local` 無し）でも `next build` が通るため。

### Supabase Auth

- **何を決めたか**: `@supabase/ssr` を使い、Server / Browser / Service Role の 3 種類のクライアントを分ける。
- **なぜか**: App Router 対応と、管理操作に Service Role を使う必要があるため。
- **今後変更すると問題になるポイント**: Cookie セッション管理、Middleware 導入。

---

## 5. Files Changed（このセッションで作成・変更された主なファイル）

| パス | 変更内容 | 役割 | 次セッションで確認すべきポイント |
| --- | --- | --- | --- |
| `supabase/migrations/001_initial.sql` | 作成 | DB スキーマ | `projects/mansions/buildings/units` 等のリレーション |
| `scripts/migrate.js` | 作成 | マイグレーション実行スクリプト | Supabase への接続・実行 |
| `scripts/seed-pr3.js` | 作成 | 5 マンション seed | 手動で投入済み。再実行は重複に注意 |
| `data/pr3-mansions.json` | 作成 | seed 用ソース JSON | HARUMI FLAG の棟数不足を含む |
| `docs/architecture.md` | 更新 | アーキテクチャ設計 | 4 階層モデル、パイプライン |
| `docs/data-model.md` | 更新 | データモデル設計 | `Project → Mansion → Building → Unit` |
| `docs/data-rights.md` | 更新 | データ権利表 | 属性単位の `publication_allowed` 判定基準 |
| `docs/matching.md` | 更新 | Matching ルール | Building 数整合性確認ルール |
| `docs/pr3-target-mansions.md` | 作成 | PR3 対象マンション調査 | 5 マンション概要 |
| `app/(public)/mansion/[slug]/page.tsx` | 更新 | マンション Public ページ | `getPublicMansion` 使用、metadata / JSON-LD |
| `lib/db/index.ts` | 作成 | DB クライアント | `getSql()` lazy 化 |
| `lib/public/mansion.ts` | 作成 | Public 用データ取得 | `publication_allowed` フィルタ、fixture fallback |
| `lib/fixtures/pr4-mansion.ts` | 作成 | Preview 用 fixture | `development` / `preview` で表示 |
| `lib/auth/supabase.ts` | 作成 | Supabase クライアント | 3 種類のクライアント作成 |
| `package.json` / `pnpm-lock.yaml` | 更新 | 依存追加 | `ulid`, `@supabase/ssr`, `@supabase/supabase-js` |
| `.github/workflows/ci.yml` | 更新 | CI | pnpm 10.34.5 使用 |
| `AGENTS.md` | 更新 | プロジェクトガイドライン | ユーザー編集済み |

### 重要な関数 / component / API

- `getPublicMansion(slug: string)` / `lib/public/mansion.ts`
- `getSql()` / `lib/db/index.ts`
- `createServerSupabaseClient()` / `createServiceRoleClient()` / `createBrowserSupabaseClient()` / `lib/auth/supabase.ts`
- `app/(public)/mansion/[slug]/page.tsx`（Server Component）

---

## 6. Data / Database

### schema（主なテーブル）

- `data_sources`
- `raw_source_records`
- `source_observations`
- `entity_attribute_sources`
- `projects`
- `mansions`
- `buildings`
- `units`
- `users`（Supabase Auth と連携予定）
- `owner_properties` / `appraisal_requests`（`002_auth_and_owner.sql` で `auth.users` への FK、重複登録防止の unique index、RLS を追加済み）

### 登録済みデータ

- `data_sources` 1 件：PR3 手動調査
- `raw_source_records` 1 件：`data/pr3-mansions.json`
- `projects` 3 件：パークタワー勝どき、二子玉川ライズ、HARUMI FLAG
- `mansions` 5 件
- `buildings` 12 件
- `entity_attribute_sources` 全属性 `publication_allowed = false`

### 注意

- 全ての Canonical 属性は `publication_allowed = false` なので、本番 Public ページでは何も表示されない。
- HARUMI FLAG SUN VILLAGE は Building 数が不足（DB 3 棟、実際 7 棟）。

---

## 7. APIs / External Services

### 外部サービス

- **Supabase**: PostgreSQL + PostGIS + Auth
- **PLATEAU**: 3D 都市モデル、Building 外形・位置（PDL 1.0 / CC BY 4.0）
- **Digital Agency Address Base**: 住所データ（PDL 1.0）
- **国土地理院**: 地理院地図 / 地名情報（条件付き）
- **不動産情報ライブラリ**: 取引価格情報（API 利用申請・審査必要）
- **手動 Web 調査**: 公式・ポータルサイトからの引用（利用規約未確認）

### 必要な環境変数

- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

（秘密情報そのものは記載しない。`/.env.example` に記載あり。）

---

## 8. Known Issues

- **Building 数不一致**: HARUMI FLAG SUN VILLAGE は DB に 3 棟、実際 7 棟。残り 4 棟はラベル不確定のため未登録。
- **全属性非公開**: PR3 で投入した 5 マンションは全属性 `publication_allowed = false`。本番 Public ページでは 404 になる。
- **git CLI 未使用**: `xcode-select --install` の影響で `git` コマンドが動かない可能性がある。push は `isomorphic-git` 経由。
- **Supabase SSR peer deps**: `@testing-library/jest-dom` 等の警告は無視可能だが、近いうちに整理。
- **Node 20 非推奨警告**: GitHub Actions 上で Node 24 強制中。現状 CI は通る。

---

## 9. Tests / Verification

### 実施済み・成功

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅（`.env.local` あり / なし 両方）
- `pnpm test` ✅
- GitHub Actions `ci` ✅
- `scripts/seed-pr3.js` 実行 → DB へ 5 マンション投入 ✅
- DB 状態確認用 ad-hoc レポート実行 ✅

### 未実施

- E2E（Auth フロー：実 Supabase プロジェクトでのサインアップ / ログイン）
- Supabase Auth 実際のユーザー作成・ログイン
- 本番 Public ページ表示（`publication_allowed=true` データ無しのため）

### 手動確認が必要な箇所

- Supabase 側の Auth Users / `owner_properties` 連携
- `/mansion/fixture-mansion` を `ALLOW_PREVIEW_DATA=true` もしくは `development` で表示確認

---

## 10. Git Status

- **branch**: `main`
- **latest relevant commit**: `f4be10c` — `feat: install @supabase/ssr / supabase-js and add auth client`
- **uncommitted changes**: なし
- **staged changes**: なし
- **untracked files**: なし

（`isomorphic-git` で確認済み。`git` CLI は使わない可能性あり。）

---

## 11. Next Actions（優先順位）

1. **Supabase 環境での PR5 通し確認**
   - 対象: Supabase Dashboard（Auth のメール確認設定 / Redirect URL）、`pnpm db:migrate`
   - 完了条件: 実ユーザーでサインアップ → `/register` で登録 → `owner_properties` に行が作成される

2. **PR6: My Mansion ダッシュボード**
   - 対象: `/mypage`、`lib/owner/queries.ts`（`listOwnerProperties` を活用）
   - 完了条件: 登録済みの部屋と参考価格 / 相場を表示（架空の市場データは表示しない）

3. **`units` と `owner_properties` の紐付け**
   - 現状は部屋番号を自由入力で保存し、`unit_id` は未使用

4. **CI 再確認**
   - 完了条件: 新規 commit 後、GitHub Actions `ci` が成功

---

## 12. Do NOT Do

- `publication_allowed = false` の属性を `true` に変更しない（法務確認済みの属性のみ）。
- `supabase/migrations/001_initial.sql` を再実行して既存テーブルを drop しない。
- `scripts/seed-pr3.js` を再実行しない（重複する可能性あり）。
- `git` CLI が動かない環境では `isomorphic-git` を使うか、ユーザーに `git` 確認を依頼する。
- `SUPABASE_SERVICE_ROLE_KEY` をクライアント側に漏らさない。
- 既存の `Project → Mansion → Building → Unit` モデルを変更しない。
- Public URL 方針を `/project/` 配下に戻さない。
- HARUMI FLAG SUN VILLAGE の不明棟を架空のラベルで補完しない。

---

## 13. Important Context From Conversation

- ユーザーは **PR4 の選択肢 3** を選択：公開可否を厳格に維持し、法務確認を経て `publication_allowed = true` にする。
- `noindex` は検索エンジン制御であり、データ公開可否の代替ではない。
- 公式・ポータルサイトからの引用は `publication_allowed = false` として内部 Canonical 化のみ。
- 5 マンションの正式名称・住所は現状 Public ページに表示不可。本番では 404 または fixture のみ。
- ユーザーは三井のリハウス「マンションライブラリー」、ノムコム「マンションデータPlus」を主要ベンチマークとする。
- ユーザーは「不動産を売るための査定サイト」ではなく「資産価値を継続的に確認するサービス」と強調。
- UI ベンチマークは構造・UX の参考であり、コンテンツのコピー禁止。

---

## 14. Resume Prompt

```
このプロジェクトは /Users/ryuichi.fujimoto/property-platform にあります。まず docs/handoff.md を読み、プロジェクトの目的・現在の状態・次のアクションを把握してください。

次に以下を実施してください：
1. `node` で isomorphic-git または可能な範囲で `git status`, `git log` を確認し、docs/handoff.md の記載と一致するか検証してください。
2. `package.json`, `pnpm-lock.yaml`, `lib/`, `app/`, `docs/`, `supabase/migrations/` の最新状態を確認し、矛盾があれば実コードを優先して判断してください。
3. `.env.local` に `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` が設定されているか確認してください。秘密情報そのものはログに出力しないでください。
4. 既存実装を壊さず、不要な全面 rewrite を避けてください。Next Actions の最優先項目「PR5: オーナー登録フロー実装」から作業を再開してください。
5. 作業開始前に `pnpm lint && pnpm typecheck` を実行し、現状が green であることを確認してください。必要に応じて `pnpm build` も実行してください。
6. 不明点があれば「不明」「未確認」と明記し、ユーザーに確認するか、既存の docs/ 設計を優先して判断してください。
```
