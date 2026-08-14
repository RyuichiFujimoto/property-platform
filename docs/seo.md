# SEO Foundation

## URL 設計

- 詳細ページ: `/mansion/[slug]`
- 内部的には Building ID を正とする。
- `building_slugs` テーブルで `building_id ↔ slug` の履歴を管理。
- slug 変更時は旧 URLから 301 redirect する。

## index / noindex policy

### index 対象

- `public_status = published`
- 公開可能属性が十分存在する
- ページ内容が thin でない
- canonical URL が確定している

### noindex 対象

- `public_status = draft | hidden`
- `publication_allowed = false` な属性のみのページ
- 検索 filter による動的 URL
- 未レビュー・低信頼度の建物
- エラーページ

## 必須メタ情報

- `<title>`
- `<meta name="description">`
- `<link rel="canonical" href="...">`
- Open Graph: `og:title`, `og:description`, `og:url`, `og:type`
- Twitter Card
- JSON-LD: `RealEstateListing` / `LocalBusiness` （公開許可属性のみ）

## Sitemap / Robots

- `/sitemap.xml` に `published` な建物ページのみ含める。
- `/robots.txt` で noindex ディレクトリや管理者画面を disallow。
- ページ数が増えた場合は index sitemap に分割。

## Faceted Navigation

- 駅・エリア・価格帯などの filter は `rel="nofollow"` または canonical 集約。
- 無限に indexable URL が生成されないように、検索パラメーターを noindex する。
