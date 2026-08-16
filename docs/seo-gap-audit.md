# SEO 実装ギャップ棚卸し（docs/seo.md 対比）

対象コミット: `fix/error-handling-propagation`（PR #3）時点
対象範囲: `docs/seo.md` に定義された要件と、`app/` / `lib/public/` / `supabase/migrations/` の実装との差分

> 注意: AGENTS.md が参照している SEO スキル（`/seo-audit`, `/seo-technical-check` 等）は、この環境の playbook / repo skill / knowledge のいずれにも登録されていません。したがって本監査は `docs/seo.md` と AGENTS.md の記述のみを基準にしています。

---

## サマリ

`docs/seo.md` の要件に対して、13 件のギャップを検出しました。うち未実装 8 件、部分実装 4 件、実装バグ 1 件です。

ビジネス影響の観点で優先すべきは **P0 の 4 件**です。これらは「作ったページが検索結果に出ない」「出てはいけないページが出る」に直結します。それ以外は将来のページ数増加に備えた整備です。

---

## P0: 公開前に必要

### 1. `sitemap.xml` が存在しない — 未実装

- 要件: `docs/seo.md` 「`/sitemap.xml` に `published` な Mansion ページとエリアページのみ含める」
- 現状: `app/` 配下に `sitemap.ts` も静的 `sitemap.xml` もありません。`public/` ディレクトリ自体が未作成です。
- 影響: 内部リンクがほぼ無い状態（`/mansion` 一覧はプレースホルダーで個別ページへのリンクが 0 本）なので、sitemap が無いとクローラーがマンションページを発見する経路がありません。ページを作っても検索に出ません。
- 対応: `app/sitemap.ts` で `public_status='published' AND review_status='approved'` のマンションを列挙。DB 未設定時は空配列を返し、ビルドを壊さないこと（PR #3 の `isDatabaseConfigured()` を利用）。

### 2. `robots.txt` が存在しない — 未実装

- 要件: `docs/seo.md` 「`/robots.txt` で noindex ディレクトリや管理者画面を disallow」
- 現状: 未作成。`/admin` は現状プレースホルダーですが認証も noindex も無く、クロール可能です。
- 影響: 管理画面が将来インデックスされるリスク。sitemap の場所も伝えられません。
- 対応: `app/robots.ts` で `/admin` を disallow、`sitemap` を宣言。あわせて `/admin` 側にも `robots: { index: false }` を付与（robots.txt の disallow は「インデックスさせない」保証にはならないため二重防御）。

### 3. `metadataBase` が未設定で canonical / og:url が相対 URL — 部分実装

- 要件: `docs/seo.md` 必須メタ情報「`<link rel="canonical">`」「`og:url`」
- 現状: `app/(public)/mansion/[slug]/page.tsx` は `canonical: '/mansion/...'` と相対値のみ。`app/layout.tsx` に `metadataBase` がありません。
- 影響: canonical と og:url が絶対 URL になりません。og:url は絶対 URL が必須で、SNS シェア時のプレビューが機能しません。canonical も、プレビュー環境や `www` 有無の重複 URL を正規化できません。
- 対応: `layout.tsx` に `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')` を設定し、環境変数を Vercel に登録。

### 4. プレビュー用の架空データが `index: true` を宣言している — 実装バグ

- 要件: `docs/seo.md` noindex 対象「架空の市場データを表示する可能性があるページ」
- 現状: `lib/public/mansion.ts` の `isPreviewMode()` が真のとき（`NODE_ENV=development` / `VERCEL_ENV=preview` / `ALLOW_PREVIEW_DATA=true`）、どの slug でも fixture を返します。一方 `generateMetadata()` はデータがあれば無条件で `robots: { index: true }` を返します。
- 影響: Vercel のプレビュー環境は既定で `X-Robots-Tag: noindex` が付くため実害は出にくいですが、`ALLOW_PREVIEW_DATA=true` が本番に紛れ込むと、実在しない URL 全てが「実在するマンションページ」として index 宣言されます。fixture 由来の内容は全 slug で同一なので、大量の重複コンテンツにもなります。
- 対応: preview 由来のデータでは `robots: { index: false }`。あわせて本番ビルドで `ALLOW_PREVIEW_DATA` が真なら起動時に警告を出す。

---

## P1: ページ数が増える前に必要

### 5. thin page / 低信頼度の noindex 判定が無い — 未実装

- 要件: `docs/seo.md` index 対象「公開可能属性が十分存在する」「ページ内容が thin でない」「未レビュー・低信頼度の Mansion は noindex」
- 現状: `canonical_name` が 1 つあるだけで `index: true` になります。住所も駅も棟情報も無いページが index されます。`mansions.confidence_score` カラムは存在しますが、公開判定に使われていません。
- 影響: 中身の薄いページを大量に index させると、サイト全体の評価が下がります（新規ドメインでは特に影響が大きい）。
- 対応: 「index に必要な最低属性セット」と `confidence_score` の閾値をポリシーとして決め、`getPublicMansion()` の戻り値に `indexable: boolean` を持たせて `generateMetadata()` で分岐。**閾値の決定は経営判断が必要なので、実装前に合意が必要です。**

### 6. Faceted navigation 対策が無い — 未実装（該当ページも未実装）

- 要件: `docs/seo.md` 「filter は `rel="nofollow"` または canonical 集約」「検索パラメーターを noindex」
- 現状: エリア/駅/価格帯の絞り込み UI 自体が未実装なので現時点の実害は 0。ただしガードも無いため、実装時に無防備なまま出る可能性があります。
- 対応: 検索パラメーター付き URL を `noindex` にする共通処理を、絞り込み UI の実装と同時に入れる。

### 7. JSON-LD の型が要件と不一致、かつ `floorSize` が意味的に誤り — 部分実装（バグ含む）

- 要件: `docs/seo.md` 「JSON-LD: `RealEstateListing` / `LocalBusiness` / `Place`（公開許可属性のみ）」
- 現状: `@type: 'Residence'` + `containsPlace: [{ '@type': 'Apartment' }]`。
- バグ: `floorSize: b.floorsAbove` — `floorsAbove` は「地上階数」ですが `floorSize` は「床面積」です。「床面積 43」のような誤情報を構造化データとして出しています。
- 影響: 誤った構造化データは、リッチリザルト対象外になるだけでなく、生成AI検索の引用時にも誤情報として使われます。
- 対応: `floorSize` を削除（面積の公開許可属性を持っていないため）。型は `Residence`/`ApartmentComplex` の方が実態に近いので、`docs/seo.md` の記述を実装に合わせて更新するか、実装を要件に合わせるかを決める。**要件と実装のどちらが正か、判断が必要です。**

### 8. Twitter Card が無い — 未実装

- 要件: `docs/seo.md` 必須メタ情報「Twitter Card」
- 現状: `twitter` メタデータの出力がありません。`og:image` もありません。
- 影響: SNS シェア時にタイトルだけのリンクになり、流入が落ちます。
- 対応: `twitter: { card: 'summary_large_image', ... }` を追加。画像は OG 画像の生成方針（`opengraph-image.tsx` による動的生成など）とセットで決める。

---

## P2: 構造的な設計課題

### 9. URL 階層が `docs/seo.md` の設計と異なる — 未実装

- 要件: `/mansion/[project_slug]/[mansion_slug]`、任意で `/mansion/[project_slug]/[mansion_slug]/[building_slug]`
- 現状: `/mansion/[slug]` のフラット構成のみ。`projects` テーブルと `mansions.project_id` はスキーマに存在しますが、ルーティングに反映されていません。大規模開発の親ページ（HARUMI FLAG 等）も未実装。
- 影響: 大規模開発の親ページを作れないため、「HARUMI FLAG」のようなブランド検索需要を取り逃がします。後から階層を変えると URL 変更 = 順位リセットのリスクがあるため、**公開前に確定すべき項目**です。

### 10. slug 変更時の 301 redirect が無い — 未実装

- 要件: `docs/seo.md` 「slug 変更時は旧 URL から 301 redirect します」
- 現状: `mansions.slug` は `UNIQUE` な単一カラムで、旧 slug の履歴テーブルがありません。slug を変更すると旧 URL は即 404 になります。
- 影響: AGENTS.md が求める「Building ID が変わらないこと」は `public_id` で担保されていますが、URL の継続性は担保されていません。運用で名称修正が入るたびに、蓄積した評価が失われます。
- 対応: `mansion_slug_history` テーブル（旧 slug → mansion_id）+ 旧 slug ヒット時の 301。マイグレーションが必要。

### 11. エリアページが未実装 — 未実装

- 要件: `docs/seo.md` URL 設計「`/area/setagaya-mansions` 等」、sitemap にも含める対象
- 現状: ルート自体がありません。マンションページ間の内部リンクを供給する導線も無い状態です。

### 12. `/mansion` 一覧と `/admin` がプレースホルダーのまま index 可能 — 部分実装

- 現状: どちらも中身が「プレースホルダーです」の 1 行で、`robots` 指定がありません。
- 影響: `docs/seo.md` の thin page ポリシーに反します。`/admin` は管理画面として disallow 対象でもあります。
- 対応: 中身が入るまで `robots: { index: false }` を明示。

### 13. エラーページの noindex が明示されていない — 部分実装

- 要件: `docs/seo.md` noindex 対象「エラーページ」
- 現状: `app/not-found.tsx` は `robots: { index: false }` を出力済み（PR #3 で追加、ブラウザで確認済み）。一方 `app/error.tsx` / `app/global-error.tsx` は client component のため metadata を出せません。
- 影響: 実務上、これらは HTTP 500 で返るためインデックスされません。リスクは低いです。
- 対応: 明示したい場合のみ、`middleware` か route handler で 5xx 応答に `X-Robots-Tag: noindex` を付与。

---

## PR #3（エラーハンドリング）との関係

PR #3 は `docs/seo.md` に対して **違反を 1 件解消し、要件を 1 件満たしました**。新たな違反はありません。

- 解消: 変更前は `DATABASE_URL` の設定漏れだけで、`getPublicMansion()` が `null` を返し、`published` なマンションページ全てが 404 + `robots: index: false` になっていました。`docs/seo.md` の index 対象を noindex にしてしまう挙動で、しかも監視に何も出ませんでした。現在は 500 + 構造化ログです。検索エンジンは 500 を一時障害として扱い URL を保持します。
- 充足: `app/not-found.tsx` の追加により、「エラーページは noindex」が 404 について満たされました。
- 維持: データ不整合（`publication_allowed` な `canonical_name` が無い等）は引き続き 404 = noindex 扱いですが、これは `docs/seo.md` の「`publication_allowed = false` な属性のみのページは noindex」に沿った正しい挙動です。今回、これを警告ログとして観測できるようにしました。

---

## 推奨する進め方

1. **1 セッション目**: P0 の 4 件（sitemap / robots / metadataBase / preview の noindex）。判断待ちが無く、公開の前提条件になる部分です。
2. **2 セッション目**: P2 の 9・10（URL 階層と slug 履歴 + 301）。URL を後から変えると評価がリセットされるため、公開前に確定させる必要があります。マイグレーションを含みます。
3. **3 セッション目**: P1 の 5・7・8（thin page 判定 / JSON-LD 修正 / Twitter Card）。5 と 7 は先に方針の合意が必要です。
4. エリアページ（11）と faceted navigation（6）は、掲載マンション数が増えてから着手。

事前に決めていただきたいのは 2 点です。

- **index させる最低ライン**（項目 5）: 「住所と最寄駅と棟情報が揃っていれば index」等の基準。
- **JSON-LD の型**（項目 7）: `docs/seo.md` の `RealEstateListing` に合わせるか、実装の `Residence` に合わせて要件側を直すか。`RealEstateListing` は「売り出し中の物件情報」を表す型なので、売出情報を扱わない現在のページには `Residence` の方が適切です。
