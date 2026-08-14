# Data Model

## 命名規則

- テーブル名は snake_case
- canonical テーブルは `projects` / `mansions` / `buildings` / `units`
- raw/observation テーブルは `_raw`, `_observations` サフィックスを使用
- canonical テーブルの id は ULID + 種別プレフィックス

## Entity relation diagram

```
projects ||--o{ mansions        : "1:N (optional)"
mansions ||--o{ buildings       : "1:N"
buildings ||--o{ units          : "1:N"
mansions ||--o{ units           : "1:N via mansion_id (building optional)"
users ||--o{ owner_properties   : "1:N"
owner_properties ||--o{ appraisal_requests : "1:N"
mansions ||--o{ owner_properties : "1:N"
buildings ||--o{ owner_properties : "1:N (optional)"
units ||--o{ owner_properties   : "1:N (optional)"
projects ||--o{ entity_attribute_sources : "provenance"
mansions ||--o{ entity_attribute_sources : "provenance"
buildings ||--o{ entity_attribute_sources : "provenance"
units ||--o{ entity_attribute_sources   : "provenance"
```

## Canonical entities

### projects

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | `PRJ_` 付き ULID |
| public_id | text | 公開用 ID（slug 等） |
| canonical_name | text | 正規化プロジェクト名 |
| slug | text | URL 用スラッグ |
| prefecture | text | 都道府県 |
| city | text | 市区町村 |
| ward | text | 区 |
| address_summary | text | 住所要約 |
| latitude | numeric | 緯度 |
| longitude | numeric | 経度 |
| geometry | geometry(Point, 4326) | PostGIS ポイント |
| developer | text | デベロッパー |
| description | text | 説明 |
| public_status | text | draft / published / hidden |
| review_status | text | pending / approved / rejected |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### mansions

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | `MAN_` 付き ULID |
| public_id | text | 公開用 ID |
| project_id | text (nullable) | projects.id |
| canonical_name | text | 正規化マンション名 |
| slug | text | URL 用スラッグ |
| prefecture | text | 都道府県 |
| city | text | 市区町村 |
| ward | text | 区 |
| town | text | 町字 |
| address | text | 住所 |
| latitude | numeric | 緯度 |
| longitude | numeric | 経度 |
| built_year | smallint | 竣工年 |
| built_month | smallint | 竣工月 |
| total_units | smallint | 総戸数 |
| developer | text | デベロッパー |
| constructor | text | 施工業者 |
| management_company | text | 管理会社 |
| mansion_type | text | マンション種別 |
| public_status | text | draft / published / hidden |
| review_status | text | pending / approved / rejected |
| confidence_score | numeric | 名寄せ信頼度 |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### buildings

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | `BLD_` 付き ULID |
| public_id | text | 公開用 ID |
| mansion_id | text | mansions.id |
| canonical_name | text | 正規化建物名 |
| building_label | text | A棟 / Tower 1 等 |
| latitude | numeric | 緯度 |
| longitude | numeric | 経度 |
| geometry | geometry(Point, 4326) | PostGIS ポイント |
| built_year | smallint | 竣工年 |
| built_month | smallint | 竣工月 |
| floors_above | smallint | 地上階数 |
| floors_below | smallint | 地下階数 |
| total_units | smallint | 総戸数 |
| structure | text | 構造 |
| public_status | text | draft / published / hidden |
| review_status | text | pending / approved / rejected |
| confidence_score | numeric | 名寄せ信頼度 |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### units

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | `UNT_` 付き ULID |
| public_id | text | 公開用 ID |
| mansion_id | text | mansions.id |
| building_id | text (nullable) | buildings.id |
| room_number | text (nullable) | 号室 |
| floor | smallint | 階 |
| area_sqm | numeric | 専有面積（m²） |
| layout | text | 間取り |
| direction | text | 向き |
| balcony_area_sqm | numeric (nullable) | バルコニー面積 |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

## Owner and user entities

### users

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | Supabase Auth 利用時は Auth ID と一致 |
| email | text | メール |
| phone | text (nullable) | 電話番号 |
| name | text | 表示名 |

### owner_properties

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | text | `OWN_` 付き ULID |
| user_id | uuid | users.id |
| mansion_id | text | mansions.id |
| building_id | text (nullable) | buildings.id |
| unit_id | text (nullable) | units.id |
| room_number | text (nullable) | 号室 |
| floor | smallint | 階 |
| area_sqm | numeric | 専有面積 |
| layout | text | 間取り |
| direction | text | 向き |
| estimated_price | numeric (nullable) | 推定価格 |
| estimated_price_min | numeric (nullable) | 推定価格下限 |
| estimated_price_max | numeric (nullable) | 推定価格上限 |
| registered_at | timestamptz | 登録日 |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### appraisal_requests

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| user_id | uuid | users.id |
| owner_property_id | text | owner_properties.id |
| selling_timeline | text | 売却タイムライン |
| selling_reason | text | 売却理由 |
| comment | text | コメント |
| status | text | new / contacted / appointment / closed |
| created_at | timestamptz | 作成日 |
| updated_at | timestamptz | 更新日 |

### user_events

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| user_id | uuid (nullable) | users.id |
| event_type | text | mansion_page_view / owner_registration_started / owner_registration_completed / mypage_view / valuation_view / appraisal_started / appraisal_completed 等 |
| properties | jsonb | イベント固有プロパティ |
| created_at | timestamptz | 作成日 |

## Market and source tracking

### market_observations

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| entity_type | text | project / mansion / building / unit / area / station |
| entity_id | text | 対象エンティティ ID |
| metric_type | text | price_per_sqm / price_per_tsubo / price_range 等 |
| value | numeric | 値（または price_range 等は別途表現） |
| period_start | date | 集計期間開始 |
| period_end | date | 集計期間終了 |
| sample_size | integer | サンプル数 |
| source_id | uuid | data_sources.id |
| observed_at | timestamptz | 観測日時 |
| publication_allowed | boolean | 公開許可 |
| created_at | timestamptz | 作成日 |

### property_listings

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| mansion_id | text | mansions.id |
| building_id | text (nullable) | buildings.id |
| unit_id | text (nullable) | units.id |
| floor | smallint (nullable) | 階 |
| area_sqm | numeric (nullable) | 専有面積 |
| layout | text (nullable) | 間取り |
| direction | text (nullable) | 向き |
| asking_price | numeric | 売出価格 |
| price_per_sqm | numeric (nullable) | m² 単価 |
| price_per_tsubo | numeric (nullable) | 坪単価 |
| listed_at | date | 掲載日 |
| source_id | uuid | data_sources.id |
| source_url | text | 取得元 URL |
| observation_id | uuid | 紐づく観測 |
| publication_allowed | boolean | 公開許可 |
| created_at | timestamptz | 作成日 |

## Data pipeline and provenance

### data_sources

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
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

### source_observations

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| source_id | uuid | data_sources.id |
| entity_type | text | project / mansion / building / unit |
| external_id | text | 外部 ID |
| observed_attributes | jsonb | 抽出属性（元文字列） |
| observed_at | timestamptz | 取得日時 |
| raw_source_record_id | uuid | raw_source_records.id |
| created_at | timestamptz | 作成日 |

### entity_attribute_sources

すべての canonical エンティティ属性の来歴を追跡します。

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | uuid | 内部 ID |
| entity_type | text | project / mansion / building / unit |
| entity_id | text | 対象エンティティ ID |
| attribute_name | text | 属性名 |
| attribute_value | text | 属性値 |
| source_id | uuid | data_sources.id |
| observation_id | uuid | source_observations.id |
| confidence | numeric | 信頼度 |
| publication_allowed | boolean | 公開許可 |
| verified_at | timestamptz | 確認日 |
| created_at | timestamptz | 作成日 |
