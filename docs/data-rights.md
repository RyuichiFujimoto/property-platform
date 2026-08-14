# Data Rights

MVP targets 50 real mansions in Tokyo 23 wards, including Setagaya.
各データソースについて、取得可否・利用可否を管理する。

## データ権利管理テーブル

| データソース | 取得可能 | 内部利用可能 | 公開利用可能 | 商用利用可能 | 出典表示要否 | 確認日 | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLATEAU | 〇 | 〇 | 〇 | 〇 | 要 | - | 国土地交通省オープンデータ |
| Digital Agency Address Base | 〇 | 〇 | 〇 | 〇 | 要 | - | 政府標準オープンデータ |
| 国土地理院 | 〇 | 〇 | 条件付き | 条件付き | 要 | - | 使用条件を確認中 |
| 不動産情報ライブラリ | 〇 | 〇 | 条件付き | 条件付き | 要 | - | API 利用規約確認中 |
| SUUMO | × | 条件付き | × | × | 要 | - | スクレイピング禁止の可能性。確認中 |
| LIFULL HOME'S | × | 条件付き | × | × | 要 | - | 利用規約確認中 |
| at home | × | 条件付き | × | × | 要 | - | 利用規約確認中 |

## ルール

- `terms_status = approved` かつ `publication_status = allowed` のみ public ページへ表示する。
- `commercial_use_status = restricted` のデータを広告収益ページに使用しない。
- 出典表示が必要なデータは、ページ下部に表示する `Sources` セクションへ記載する。
- 未確認ソースは `raw_source_records` / `source_observations` へ保存可能だが、`public_status` には反映しない。
- 架空の市場データを表示しない。データが不足する場合は「データがありません」と表示するか、セクションを非表示にする。
