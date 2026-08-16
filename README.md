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

`supabase/migrations/*.sql` をファイル名の昇順にすべて適用します（各ファイルは再実行しても安全な冪等 SQL）。

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
| `pnpm test:coverage` | テスト実行 + カバレッジ計測（`lib/` 配下） |
| `pnpm db:migrate` | データベースマイグレーション（全 migration を順に適用） |
| `pnpm db:seed` | seed データ投入 |

## オーナー登録（マイマンション）

- `/mansion/<slug>` の CTA から `/register?mansion=<slug>` へ遷移します。
- `/register` では Supabase Auth（メールアドレス + パスワード）でログイン / 新規登録し、棟・部屋番号・階数・専有面積・間取り・方角を入力して `owner_properties` に保存します。
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` が未設定の環境では、エラーにせず「登録機能は準備中」の表示になります。
- メール確認が有効な Supabase プロジェクトでは、確認メールのリンクが `/auth/callback` を経由して `/register` に戻ります。
- `owner_properties` / `appraisal_requests` は RLS により本人のみ参照・更新できます（`supabase/migrations/002_auth_and_owner.sql`）。

## ドキュメント

- `docs/architecture.md` — システム全体図と 4 層エンティティモデル
- `docs/data-model.md` — DB schema
- `docs/data-sources.md` — 使用データソース一覧
- `docs/data-rights.md` — データ利用規約管理
- `docs/matching.md` — Mansion / Building 名寄せ仕様
- `docs/seo.md` — index/noindex policy と CTA 文言
- `docs/PR-plan.md` — PR 分割計画
