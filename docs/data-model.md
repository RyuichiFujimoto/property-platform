# Data Model

## 命名規則

- テーブル名は snake_case
- canonical テーブルは `buildings` など単数系
- raw/observation テーブルは `_raw`, `_observations` サフィックス

## テーブル一覧

### data_sources

データソースのメタ情報と利用条件を管理する。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid / serial | 内部 ID |
| name | text | データソース名 |
| source_type | text | plateau / address / portal 等 |
| base_url | text | 公式 URL |
| acquisition_method | text | api / download / scraper |
| terms_status | text | approved / pending_review / internal_only / prohibited |
| scraping_status | text | enabled / disabled / fixtures_only |
| commercial_use_status | text | allowed / restricted / prohibited |
| publication_status | text | allowed / not_allowed |
| terms_checked_at | timestamptz | 規約確認日 |
| notes | text | 備考 |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### raw_source_records

外部データの生ペイロード。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| source_id | uuid | data_sources.id |
| external_id | text | 外部 ID |
| raw_payload | jsonb | 生データ |
| source_url | text | 取得元 URL |
| content_hash | text | SHA256 等 |
| observed_at | timestamptz | 取得日時 |
| created_at | timestamptz | 作成日 |

### building_observations

ソースごとの建物観測データ。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| source_id | uuid | ソース |
| external_id | text | 外部 ID |
| building_name_raw | text | 元の建物名 |
| address_raw | text | 元の住所 |
| built_year_raw | text | 竣工年（元） |
| built_month_raw | text | 竣工月（元） |
| floors_raw | text | 階数（元） |
| total_units_raw | text | 総戸数（元） |
| structure_raw | text | 構造（元） |
| latitude_raw | numeric | 緯度（元） |
| longitude_raw | numeric | 経度（元） |
| source_url | text | 取得元 URL |
| observed_at | timestamptz | 取得日時 |
| raw_source_record_id | uuid | raw_source_records.id |

### buildings

canonical building master。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | BLD_ 付き ULID |
| canonical_name | text | 正規化建物名 |
| canonical_address | text | 正規化住所 |
| prefecture | text | 都道府県 |
| city | text | 市区町村 |
| ward | text | 区 |
| town | text | 町字 |
| block | text | 番地 |
| latitude | numeric | 緯度 |
| longitude | numeric | 経度 |
| geometry | geometry(Point, 4326) | PostGIS ポイント |
| built_year | smallint | 竣工年 |
| built_month | smallint | 竣工月 |
| floors_above | smallint | 地上階数 |
| floors_below | smallint | 地下階数 |
| total_units | smallint | 総戸数 |
| structure | text | 構造 |
| building_type | text | 建物種別 |
| confidence_score | numeric | 名寄せ信頼度 |
| review_status | text | pending / approved / rejected |
| public_status | text | draft / published / hidden |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### building_source_links

建物とソース・観測の紐付け。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| building_id | text | buildings.id |
| source_id | uuid | data_sources.id |
| external_id | text | 外部 ID |
| observation_id | uuid | building_observations.id |
| match_method | text | マッチ方法 |
| match_score | numeric | スコア |
| created_at | timestamptz | 作成日 |

### building_attribute_sources

属性単位の provenance。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| building_id | text | buildings.id |
| attribute_name | text | 属性名 |
| attribute_value | text | 属性値 |
| source_id | uuid | data_sources.id |
| observation_id | uuid | building_observations.id |
| confidence | numeric | 信頼度 |
| publication_allowed | boolean | 公開許可 |
| verified_at | timestamptz | 確認日 |
| created_at | timestamptz | 作成日 |

### building_aliases

建物名の別名・正規化表現。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| building_id | text | buildings.id |
| alias | text | 別名（元） |
| normalized_alias | text | 正規化別名 |
| source_id | uuid | ソース |
| created_at | timestamptz | 作成日 |

### building_match_candidates

人間レビュー用名寄せ候補。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| observation_id | uuid | building_observations.id |
| candidate_building_id | text | buildings.id |
| score | numeric | 合計スコア |
| name_score | numeric | 名前スコア |
| address_score | numeric | 住所スコア |
| geo_score | numeric | 位置スコア |
| year_score | numeric | 年次スコア |
| status | text | pending / auto_matched / merged / rejected / new_building |
| reviewed_at | timestamptz | レビュー日 |
| reviewed_by | text | レビュー者 |
