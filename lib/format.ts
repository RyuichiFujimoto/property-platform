/**
 * null / undefined / 空文字を除いた要素だけを区切り文字で連結する。
 */
export function joinDefined(
  parts: readonly (string | null | undefined)[],
  separator = ' / '
): string {
  return parts.filter((part): part is string => Boolean(part)).join(separator);
}
