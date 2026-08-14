# Data Sources

## MVP scope

MVP targets 50 real mansions in Tokyo 23 wards, including Setagaya. Open data is used first. Portal scraping remains fixtures-only until legal and contractual approval is obtained.

## 採用予定のオープンデータ

### A. PLATEAU

- **source_type**: `plateau`
- **acquisition_method**: `download`
- **base_url**: https://www.mlit.go.jp/plateau/
- **利用目的**: 建物 geometry、位置、住所、建物属性、名称（あれば）
- **初期 MVP エリア**: 東京都 23 区（Setagaya を中心に開始）
- **terms_status**: approved
- **publication_status**: allowed
- **commercial_use_status**: allowed

### B. Digital Agency Address Base Registry

- **source_type**: `address_registry`
- **acquisition_method**: `download`
- **base_url**: https://www.digital.go.jp/policies/base_registry_address/
- **利用目的**: 住所正規化、都道府県/市区町村/町字の canonicalization
- **terms_status**: approved
- **publication_status**: allowed
- **commercial_use_status**: allowed

### C. 国土地理院データ

- **source_type**: `gsi`
- **acquisition_method**: `api`
- **base_url**: https://www.gsi.go.jp/
- **利用目的**: PLATEAU 不足エリアの補完（MVP ではオプション）
- **terms_status**: pending_review
- **publication_status**: not_allowed
- **commercial_use_status**: restricted

### D. 不動産情報ライブラリ

- **source_type**: `reins` / `real_estate_library`
- **acquisition_method**: `api`
- **base_url**: https://www.reinfolib.mlit.go.jp/
- **利用目的**: 市場統計、取引価格、周辺相場（Market Data）
- **terms_status**: pending_review
- **publication_status**: not_allowed
- **commercial_use_status**: restricted

## ポータルスクレイピング（未承認）

以下は利用規約・法務確認が完了していないため、本番アクセスは無効化する。
fixture / mock / adapter interface のみ実装する。

### SUUMO

- **source_type**: `suumo`
- **acquisition_method**: `scraper`
- **base_url**: https://suumo.jp/
- **terms_status**: pending_review
- **scraping_status**: fixtures_only

### LIFULL HOME'S

- **source_type**: `lifull`
- **acquisition_method**: `scraper`
- **base_url**: https://www.homes.co.jp/
- **terms_status**: pending_review
- **scraping_status**: fixtures_only

### at home

- **source_type**: `athome`
- **acquisition_method**: `scraper`
- **base_url**: https://www.athome.co.jp/
- **terms_status**: pending_review
- **scraping_status**: fixtures_only
