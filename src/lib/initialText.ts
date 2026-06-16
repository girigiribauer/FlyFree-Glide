// 共有元として扱ってよいページURLか。http(s) のみ許可し、それ以外
// (chrome://, about:, file://, blob: 等) は弾く。Chrome/Firefox 双方の
// 新規タブ・特殊ページがそのまま下書きに混入するのを防ぐ。
export function isShareableUrl(url?: string): boolean {
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function composeInitialText(page: { title?: string; url?: string }): string {
  const title = page.title?.trim() ?? ''
  const url = page.url ?? ''
  if (title && url) return `${title} ${url}`
  if (url) return url
  if (title) return title
  return ''
}
