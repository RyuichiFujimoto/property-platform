# property-platform

日本国内のマンション・建物データベースを中心とした、不動産 SEO ポータル／建物マスター構築プロジェクトです。

## 技術スタック

- Next.js latest stable (App Router)
- TypeScript strict mode
- Node.js LTS
- pnpm
- PostgreSQL + PostGIS (初期：Supabase PostgreSQL)
- Vercel
- Sentry
- GitHub Actions

## セットアップ

### 1. クローン

```bash
git clone <repository-url>
cd property-platform
```

### 2. 依存関係インストール

```bash
pnpm install --frozen-lockfile
```

### 3. 環境変数

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

実際の値を入力してください。

### 4. データベースセットアップ

Supabase またはローカル PostgreSQL/PostGIS を用意します。

```bash
# ローカル Supabase CLI の場合
supabase start
supabase db reset
```

### 5. マイグレーション実行

```bash
pnpm db:migrate
```

### 6. seed

```bash
pnpm db:seed
```

### 7. 開発サーバー

```bash
pnpm dev
```

### 8. テスト

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### 9. 本番ビルド

```bash
pnpm build
```

## GitHub Ruleset 手動設定手順

`gh` CLI の権限がない場合は、GitHub UI から以下を設定してください。

1. Settings → Rules → Rulesets → New ruleset → New branch ruleset
2. Target branches: `main`
3. 以下を有効化
   - Restrict deletions
   - Require a pull request before merging
     - Require approval of the most recent reviewable push
     - Dismiss stale PR approvals when new commits are pushed
   - Restrict pushes that create files that contain secrets
   - Block force pushes
   - Require status checks to pass before merging
     - `ci`
     - `lint`
     - `typecheck`
     - `test`
     - `build`
4. Save changes

## コマンド一覧

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 本番ビルド |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm test` | テスト実行 |
| `pnpm db:migrate` | データベースマイグレーション |
| `pnpm db:seed` | seed データ投入 |

## ドキュメント

- `docs/architecture.md` — システム全体図
- `docs/data-model.md` — DB schema
- `docs/data-sources.md` — 使用データソース一覧
- `docs/data-rights.md` — データ利用規約管理
- `docs/matching.md` — 名寄せ仕様
- `docs/seo.md` — index/noindex policy
