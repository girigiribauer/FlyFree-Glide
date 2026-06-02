// bsky.app の DOM 構造に依存するセレクタ。UI 変更時はここを直す。
export const BSKY_SEL = {
  myProfileNav: '[data-testid="profileMenuItem"] a[href^="/profile/"], nav a[href^="/profile/"]',
  postText: ['[data-testid="postText"]', '[data-word-wrap]', 'div[lang]'],
  postLink: 'a[href*="/post/"]',
} as const

export function getMyHandle(): string | null {
  const a = document.querySelector(BSKY_SEL.myProfileNav)
  const href = a?.getAttribute('href') ?? ''
  const match = href.match(/^\/profile\/([^/]+)$/)
  return match ? match[1] : null
}

export function findPost(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const testId = node.getAttribute('data-testid') ?? ''
    if (testId.startsWith('postThreadItem') || testId.startsWith('feedItem')) return node
    if (node.tagName === 'ARTICLE') return node
    node = node.parentElement
  }
  return null
}

export function extractAuthorHandle(post: HTMLElement): string | null {
  const testId = post.getAttribute('data-testid') ?? ''
  const m = testId.match(/(?:postThreadItem|feedItem)-by-(.+)/)
  if (m) return m[1]
  const href = (post.querySelector(BSKY_SEL.postLink) as HTMLAnchorElement | null)?.getAttribute('href') ?? ''
  const urlMatch = href.match(/\/profile\/([^/]+)\/post\//)
  return urlMatch ? urlMatch[1] : null
}

export function extractText(post: HTMLElement): string {
  for (const sel of BSKY_SEL.postText) {
    const txt = post.querySelector(sel)?.textContent?.trim()
    if (txt) return txt
  }
  return ''
}

export function extractUrl(post: HTMLElement): string {
  const a = post.querySelector(BSKY_SEL.postLink) as HTMLAnchorElement | null
  if (!a) return ''
  const href = a.getAttribute('href') ?? ''
  return href.startsWith('https://') ? href : `https://bsky.app${href}`
}
