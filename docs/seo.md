# SEO Foundation

## Concept

- SEO primary entity は `Mansion` です。
- パブリック URL は `/mansion/[slug]` です。
- UI で「今すぐ売る」「即査定」を過度に強調しません。
- Mansion ページの主な CTA は「マイマンションに登録して、今の価格を確認」です。

## URL 設計

| ページ | URL |
| --- | --- |
| 大規模開発親ページ | `/mansion/[project_slug]` |
| マンションページ | `/mansion/[project_slug]/[mansion_slug]`（Projectなしの場合は `/mansion/[mansion_slug]`） |
| 建物ページ | `/mansion/[project_slug]/[mansion_slug]/[building_slug]`（任意） |
| エリアページ | `/area/setagaya-mansions` 等 |
| マイマンション | `/mypage` |

例：
- HARUMI FLAG 親ページ：`/mansion/harumi-flag`
- HARUMI FLAG SUN VILLAGE：`/mansion/harumi-flag/sun-village`
- SUN VILLAGE A棟：`/mansion/harumi-flag/sun-village/a-tower`
- 単棟マンション：`/mansion/park-tower-kachidoki-mid`

パブリック canonical URL は常に `/mansion/` 配下です。内部では `Project / Mansion / Building` を分離しますが、ユーザー向け URL では親子関係を `/mansion/` 配下の階層で表します。 slug 変更時は旧 URL から 301 redirect します。

## index / noindex policy

### index 対象

- `mansions.public_status = published`
- 公開可能属性が十分存在する
- ページ内容が thin でない
- canonical URL が確定している
- 承認済みソースのデータ、または明示的に許可されたデータ

### noindex 対象

- `public_status = draft | hidden`
- `publication_allowed = false` な属性のみのページ
- 架空の市場データを表示する可能性があるページ
- 検索 filter による動的 URL
- 未レビュー・低信頼度の Mansion
- 同一 Mansion 内に単一 Building しかなく、追加価値がない建物ページ
- エラーページ

## CTA 文言

- 主 CTA: `マイマンションに登録して、今の価格を確認`
- 次段 CTA: `より正確な売却価格を知る`
- パブリックページで `今すぐ売る`, `即査定` 等の表現を避ける。

## 必須メタ情報

- `<title>`
- `<meta name="description">`
- `<link rel="canonical" href="...">`
- Open Graph: `og:title`, `og:description`, `og:url`, `og:type`
- Twitter Card
- JSON-LD: `RealEstateListing` / `LocalBusiness` / `Place`（公開許可属性のみ）

## Sitemap / Robots

- `/sitemap.xml` に `published` な Mansion ページとエリアページのみ含める。
- `/robots.txt` で noindex ディレクトリや管理者画面を disallow。
- ページ数が増えた場合は index sitemap に分割。

## Faceted Navigation

- 駅・エリア・価格帯などの filter は `rel="nofollow"` または canonical 集約。
- 無限に indexable URL が生成されないように、検索パラメーターを noindex する。
