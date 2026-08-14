/**
 * アプリ全体で使うエラー型とログ出力。
 * 「設定ミス」「データ不整合」を区別し、原因が埋もれないようにする。
 */

/** 環境変数など、実行前提となる設定が欠けている場合のエラー。 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** 公開データが期待する形を満たしていない場合のエラー。 */
export class DataIntegrityError extends Error {
  readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DataIntegrityError';
    this.context = context;
  }
}

function serializeContext(context: Record<string, unknown>): string {
  const entries = Object.entries(context);
  if (entries.length === 0) return '';
  return ` ${entries.map(([key, value]) => `${key}=${String(value)}`).join(' ')}`;
}

export function logWarn(scope: string, message: string, context: Record<string, unknown> = {}): void {
  console.warn(`[warn] ${scope}: ${message}${serializeContext(context)}`);
}

export function logError(
  scope: string,
  message: string,
  error?: unknown,
  context: Record<string, unknown> = {}
): void {
  console.error(`[error] ${scope}: ${message}${serializeContext(context)}`);
  if (error !== undefined) {
    console.error(error);
  }
}
