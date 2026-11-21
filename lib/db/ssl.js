/**
 * TLS options for the `postgres` client.
 *
 * Managed Postgres（Supabase 等）は TLS 必須なので、証明書を検証する
 * `verify-full` を既定にする。検証を無効化すると DB 認証情報と全データが
 * 中間者攻撃に晒される。
 *
 * - localhost 等のローカル接続では TLS を使わない。
 * - `DATABASE_CA_CERT` が設定されていれば、その CA で検証する。
 * - `DATABASE_SSL_MODE` は運用上どうしても必要な場合のみ上書きに使う
 *   ('verify-full' | 'require' | 'prefer' | 'allow')。
 *
 * @param {string} connectionString
 * @returns {false | 'verify-full' | 'require' | 'prefer' | 'allow' | { rejectUnauthorized: true, ca: string }}
 */
export function postgresSslOption(connectionString) {
  if (isLocalConnection(connectionString)) return false;

  const ca = process.env.DATABASE_CA_CERT;
  if (ca) return { rejectUnauthorized: true, ca };

  const mode = process.env.DATABASE_SSL_MODE;
  if (mode === 'require' || mode === 'prefer' || mode === 'allow') return mode;

  return 'verify-full';
}

/**
 * @param {string} connectionString
 * @returns {boolean}
 */
function isLocalConnection(connectionString) {
  try {
    const { hostname } = new URL(connectionString);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === 'host.docker.internal'
    );
  } catch {
    return false;
  }
}
