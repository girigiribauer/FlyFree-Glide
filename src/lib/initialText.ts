export function composeInitialText(page: { title?: string; url?: string }): string {
  const title = page.title?.trim() ?? ''
  const url = page.url ?? ''
  if (title && url) return `${title} ${url}`
  if (url) return url
  if (title) return title
  return ''
}
