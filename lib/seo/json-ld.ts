/**
 * JSON-LD を <script> に埋め込むための安全なシリアライズ。
 *
 * JSON.stringify は `<` や `&` をエスケープしないため、DB 由来の文字列に
 * `</script>` が含まれると script タグを閉じて任意の HTML/JS を注入できる。
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
