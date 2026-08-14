# Data Rights

MVP targets 50 real mansions in Tokyo 23 wards, including Setagaya.
各データソースについて、取得可否・利用可否を管理する。

## 基本ルール

- `terms_status = approved` かつ `publication_status = allowed` の属性のみ public ページへ表示する。
- `commercial_use_status = restricted` のデータを広告収益ページに使用しない。
- 出典表示が必要なデータは、ページ下部に表示する `Sources` セクションへ記載する。
- 未確認ソースは `raw_source_records` / `source_observations` へ保存可能だが、`public_status` には反映しない。
- 架空の市場データを表示しない。データが不足する場合は「データがありません」と表示するか、セクションを非表示にする。
- 属性単位で `publication_allowed` を判定する。同じ source でも属性によって条件が異なる。

## データソース権利一覧（PR3〜MVP）

| データソース | 公式URL / ライセンス | 取得方法 | 商用利用 | 改変 | 再配布 / Web掲載 | 出典表示 | マンション名 | 住所 | 緯度経度 | 建物属性 | 市場データ | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **PLATEAU** | https://www.mlit.go.jp/plateau/site-policy/ PDL 1.0 / CC BY 4.0 | ダウンロード | 可 | 可 | 可（出典表示） | 要 | N/A | N/A | 可 | 可 | N/A | 建物外形・位置・一部属性。名称は含まれない |
| **Digital Agency Address Base** | https://www.digital.go.jp/policies/base_registry_address_tos PDL 1.0 | API / ダウンロード | 可 | 可 | 可（出典表示） | 要 | N/A | 可 | N/A | N/A | N/A | 町字レベル住所。マンション名は含まれない |
| **国土地理院** | https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html PDL 1.0 | 地理院地図 / API | 条件付き | 条件付き | 条件付き | 要 | N/A | 条件付き | 条件付き | N/A | N/A | 測量成果には個別承認が必要な場合あり。一般的な地図表示は出典表示のみ |
| **不動産情報ライブラリ** | https://www.reinfolib.mlit.go.jp/help/termsOfUse/ PDL 1.0 | API（審査・承認） | 条件付き | 条件付き | 条件付き | 要 | N/A | N/A | N/A | N/A | 条件付き | 取引価格は加工済み。API 利用申請・審査が必要。個別物件特定不可の条件付き |
| **手動 Web 調査（公式・ポータル）** | 各サイト利用規約 | 手動参照 | 不可 | 不可 | 不可 | 要 | pending | pending | pending | pending | pending | 三井のリハウス、SUUMO、各公式サイト等。個別利用規約確認が必要 |

### 属性別 `publication_allowed` 初期判定（PR3）

| 属性 | PLATEAU | Address Base | 国土地理院 | 不動産情報ライブラリ | 手動 Web 調査 |
| --- | --- | --- | --- | --- | --- |
| マンション名 | N/A | N/A | N/A | N/A | **false**（利用規約未確認） |
| 住所（町字まで） | N/A | **true**（出典要） | 条件付き | N/A | **false** |
| 緯度経度 / geometry | **true**（出典要） | N/A | 条件付き | N/A | **false** |
| 建物階数・戸数・構造 | **true**（あれば） | N/A | N/A | N/A | **false** |
| 坪単価 / 取引価格 | N/A | N/A | N/A | 条件付き | **false** |
| 売出物件情報 | N/A | N/A | N/A | N/A | **false** |

## 確認日 / 判断根拠

- **PLATEAU**: 2025-08-14、国土交通省 `site-policy` より「公共データ利用規約 PDL 1.0 / CC BY 4.0」、商用利用可能・出典表示必要と確認。
- **Address Base**: 2025-08-14、デジタル庁利用規約より PDL 1.0 適用、商用利用可能・出典表示必要と確認。
- **国土地理院**: 2025-08-14、同コンテンツ利用規約より PDL 1.0 準拠だが、測量法に基づく基本測量成果には個別承認が必要なケースあり。現状 `pending_review`。
- **不動産情報ライブラリ**: 2025-08-14、同利用規約より PDL 1.0 適用だが API 利用には審査・承認が必要。個別物件特定不可の市場統計のみ公開可能。現状 `pending_review`。
- **手動 Web 調査**: 2025-08-14、各サイト利用規約未確認。`publication_allowed = false`、全属性 `pending_review`。

## 今後の対応

1. 国土地理院・不動産情報ライブラリの利用申請を法務確認のうえ実施。
2. 公式・ポータルサイトの `robots.txt` / 利用規約を確認し、`mansion_name` 等の掲載可否を判定。
3. `publication_allowed = true` になった属性から Public Mansion Page を段階的に公開。
4. `publication_allowed = false` の属性は内部 Canonical / Admin のみ保持し、公開しない。
