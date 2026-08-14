# property-platform

マイマンション（My Mansion）は、マンションオーナーが自宅の資産価値を継続的に追跡するサービスです。

- パブリックなマンションページからオーナー登録へ導く主 CTA:
  「マイマンションに登録して、今の価格を確認」
- 査定依頼は後段のコンバージョンです。UI では「今すぐ売る」「即査定」を過度に強調しません。
- MVP では東京都 23 区（Setagaya を含む）の 50 マンションを対象とします。

## 技術スタック

- Next.js latest stable (App Router)
- TypeScript strict mode
- Node.js LTS
- pnpm
- PostgreSQL + PostGIS（初期：Supabase PostgreSQL）
- Vercel
- Sentry
- GitHub Actions
- Supabase Auth

## セットアップ

### 1. クローン

```bash
git clone <repository-url>
cd property-platform
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

実際の値を入力してください。

### 3. データベースセットアップ

Supabase またはローカル PostgreSQL/PostGIS を用意します。

```bash
# ローカル Supabase CLI の場合
supabase start
supabase db reset
```

### 4. マイグレーション実行

```bash
pnpm db:migrate
```

### 5. seed

```bash
pnpm db:seed
```

### 6. 開発サーバー

```bash
pnpm dev
```

### 7. テスト

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### 8. 本番ビルド

```bash
pnpm build
```

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

- `docs/architecture.md` — システム全体図と 4 層エンティティモデル
- `docs/data-model.md` — DB schema
- `docs/data-sources.md` — 使用データソース一覧
- `docs/data-rights.md` — データ利用規約管理
- `docs/matching.md` — Mansion / Building 名寄せ仕様
- `docs/seo.md` — index/noindex policy と CTA 文言
- `docs/PR-plan.md` — PR 分割計画
