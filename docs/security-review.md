# セキュリティレビュー（2026-08-14）

対象: `RyuichiFujimoto/property-platform` の全コード、SQL migration、CI、依存関係。

## 修正済み

| # | 重大度 | 内容 | 影響 | 対応 |
| --- | --- | --- | --- | --- |
| 1 | Critical | `public` schema の全テーブルで RLS 未設定 | Supabase の anon key（ブラウザに配布される公開鍵）で、オーナーの住所・査定依頼などの個人情報や未検証の pipeline データを誰でも直接読み書きできる状態 | `supabase/migrations/002_enable_rls.sql` で全テーブルの RLS を有効化（policy なし＝anon/authenticated は全拒否。server 側の DB 接続と service role key は従来どおり動作） |
| 2 | High | JSON-LD を `JSON.stringify` のまま `dangerouslySetInnerHTML` に渡していた | DB 由来の名称・住所に `</script>` が含まれると script タグが閉じ、任意の JavaScript を公開ページで実行できる（保存型 XSS） | `serializeJsonLd()` で `<`, `>`, `&`, U+2028/2029 をエスケープ |
| 3 | High | DB 接続で TLS 証明書検証を無効化（`rejectUnauthorized: false`） | 中間者攻撃で DB 認証情報と全データを傍受・改変できる | `postgresSslOption()` で既定を `verify-full` に。localhost のみ TLS なし、必要時は `DATABASE_CA_CERT` / `DATABASE_SSL_MODE` |
| 4 | High | `/admin` に認証チェックなし | 管理画面（今後管理ツールが載る）が誰でも閲覧可能 | ログイン済み かつ `ADMIN_EMAILS` allowlist に一致するユーザーのみ許可。未設定時は全拒否（fail closed） |
| 5 | High | `drizzle-orm@0.30` の SQL injection（GHSA、identifier のエスケープ不備）、`vitest@1.x` の任意ファイル読み取り/実行、`postcss` の path traversal | 既知脆弱性 | `drizzle-orm@^0.45.2`, `vitest@^3.2.6`, `postcss@^8.5.23`（transitive も override） |
| 6 | Medium | `ALLOW_PREVIEW_DATA=true` が本番でも fixture を返しうる | 未検証・公開許可されていないデータが公開ページに出る（Public Data Rule 違反） | `VERCEL_ENV=production` では preview mode を無効化 |
| 7 | Medium | セキュリティヘッダ未設定 | clickjacking、MIME sniffing、referrer 漏洩 | `next.config.js` に `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS を追加し `poweredByHeader` を無効化 |
| 8 | Low | slug が未検証のまま DB クエリへ | SQL injection は無いが（parameterized query）、無制限の入力でキャッシュ汚染・ログ汚染の余地 | `getPublicMansion()` で slug 形式を検証 |
| 9 | Low | `pnpm db:migrate` が `001_initial.sql` のみ適用 | 新しい migration（RLS 等）が適用されない運用事故 | `supabase/migrations/*.sql` を昇順に全適用 |

## 問題なしを確認した項目

- **hardcoded secrets**: 現在のコードおよび git 履歴全体を走査。実鍵の混入なし（`.env.example` は placeholder のみ）。
- **SQL injection**: `lib/public/mansion.ts` と seed script は `postgres` の tagged template（parameterized）を使用。`sql.unsafe()` は repo 内の migration ファイルのみに使用。
- **CORS**: API route が存在しないため、緩い CORS 設定なし。
- **debug endpoint**: debug/健全性確認用の公開エンドポイントなし。
- **service role key**: server 側のみで参照。クライアントへの露出なし。

## 未対応（要判断）

- **Next.js 14.2 の既知脆弱性（High/Moderate 多数、SSRF・DoS 等）**: 修正版は 15.5.21 以降のみで、Next.js の major upgrade が必要。フレームワーク全体の挙動が変わるため、本 PR とは分離して実施すべき。
- **dev 依存の `vite` / `glob` の High**: 修正には `vite` 6 系への upgrade が必要。ローカル開発時のみ影響。
- **Content-Security-Policy**: 未設定。インラインの JSON-LD script があるため nonce 導入とセットで別途対応。
- **RLS policy**: 現状は「全拒否」。オーナー向け機能（`owner_properties` / `appraisal_requests`）を実装する際に、`auth.uid() = user_id` の policy を機能と同じ PR で追加する。
