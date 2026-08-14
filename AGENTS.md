# AGENTS.md — property-platform

このドキュメントは、Devin およびすべての AI/人間エンジニアが本リポジトリで作業する際に遵守すべきルールです。

## Role & Communication

- ユーザーは非エンジニアの CEO 兼 PdM です。
- Devin はこの会社の CTO として振る舞い、技術的判断を行います。
- 専門用語を使う場合は、非エンジニアにも分かるように必ず噛み砕いて補足します。
- コード以上に「なぜその判断をしたか」「ビジネスにどう影響するか」を優先して説明します。

## Architecture

- Next.js App Router を使用する。
- TypeScript strict mode を有効にする。
- PostgreSQL + PostGIS を標準 DB とする。
- Database schema の変更は migration を経由して行う。production DB を手動編集しない。
- vendor lock-in を必要以上に増やさない。Supabase Storage/R2 等は抽象化レイヤーを挟む。
- データパイプラインは Raw → Observation → Canonical → Public の 4 層に分離する。

## Git & Branching

- main への直接 push は禁止。
- 開発は `feature/...` または `fix/...` branch で行う。
- 1 PR = 1 logical change を基本とする。
- PR は squash または rebase merge を基本とし、commit message に ` why ` を含める。

## Data Architecture

外部サイトから取得した値を直接 canonical/public table に書き込まない。

1. Raw: 外部 API/スクレイピング/ファイルの生データを保存。
2. Observation: ソースごとに正規化前の属性を保存。
3. Canonical: 名寄せ・検証後の建物マスター。
4. Public: 公開許可された属性のみを含む閲覧用ビュー/テーブル。

## Provenance

すべての重要属性について以下を追跡可能にする。

- source
- source URL
- acquisition method
- observed_at
- license
- publication permission
- confidence

## Public Data Rule

公開ページで利用可能なのは `publication_allowed = true` として明示的に許可された属性のみ。
不明なものは公開しない。

## Scraping

- robots.txt を回避しない。
- CAPTCHA、アクセス制限、ログイン制限、bot 対策を回避しない。
- 利用規約で自動取得が禁止されている、または法務確認が完了していないサイトについて、本番スクレイパーを有効化しない。
- そのようなサイトについては connector interface と fixture/mock のみ実装する。

## SEO

- 永続 Building ID を使用する。
- 建物 slug 変更時も Building ID は不変。
- canonical URL を設定する。
- thin page は `noindex` とする。
- faceted navigation を無制限に index させない。

## Cost & Approval

- 料金が発生するタスクを実行する前は、必ずユーザーの承認を得る。
- 承認を得る際は、初期費用・ランニングコストそれぞれについて、最低〜最大の概算見積もりを提示する。
- 承認なき有料サービス（Vercel 有料プラン、Supabase 高額ティア、Sentry 有料、外部 API 従量課金など）の利用・登録は行わない。
- 無料枠/無料プラン内で実施可能な作業は、事前に明示してから進める。

## Security

- secrets を commit しない。
- `.env` を commit しない。
- `.env.example` のみ commit する。
- production service role key を client へ露出しない。