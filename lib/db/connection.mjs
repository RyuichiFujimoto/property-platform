/**
 * DATABASE_URL の正規化と TLS 設定。
 * lib/db（Next 側）と scripts/*.js（node 実行）の両方から使う。
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * userinfo に @ や / を含むパスワードでも接続できるよう percent-encode する。
 * すでに encode 済みの値を二重に encode しない（%40 -> %2540 を防ぐ）。
 *
 * @param {string} databaseUrl
 * @returns {string}
 */
export function normalizeConnectionString(databaseUrl) {
  const match = /^(postgres(?:ql)?:\/\/)(.*)$/.exec(databaseUrl);
  if (!match) return databaseUrl;

  const [, scheme, rest] = match;
  const atIndex = rest.lastIndexOf('@');
  if (atIndex <= 0) return databaseUrl;

  const userInfo = rest.slice(0, atIndex);
  const hostPart = rest.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex <= 0) return databaseUrl;

  const user = encodeOnce(userInfo.slice(0, colonIndex));
  const password = encodeOnce(userInfo.slice(colonIndex + 1));

  return `${scheme}${user}:${password}@${hostPart}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function encodeOnce(value) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // 不正な % シーケンスを含む場合は生の値として扱う
  }
  return encodeURIComponent(decoded);
}

/**
 * @param {string} databaseUrl
 * @returns {string | null}
 */
export function hostOf(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname;
    if (!hostname) return null;
    // IPv6 は URL 上で [::1] の形になるため括弧を外す
    return hostname.replace(/^\[|\]$/g, '');
  } catch {
    return null;
  }
}

/**
 * TLS 設定。既定はサーバー証明書を検証する 'require'。
 * ローカル DB は TLS 無し、証明書が検証できない環境のみ
 * DATABASE_SSL_MODE=no-verify を明示的に指定する。
 *
 * @param {string} databaseUrl
 * @param {string | undefined} [mode] DATABASE_SSL_MODE
 * @returns {'require' | false | { rejectUnauthorized: false }}
 */
export function sslConfigFor(databaseUrl, mode = process.env.DATABASE_SSL_MODE) {
  if (mode === 'disable') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  if (mode === 'require') return 'require';

  const host = hostOf(databaseUrl);
  if (host && LOCAL_HOSTS.has(host)) return false;
  return 'require';
}
