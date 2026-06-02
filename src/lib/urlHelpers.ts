import { RichText } from '@atproto/api'

export function toShortUrl(url: string): string {
  try {
    const urlp = new URL(url)
    if (urlp.protocol !== 'http:' && urlp.protocol !== 'https:') return url
    const path = (urlp.pathname === '/' ? '' : urlp.pathname) + urlp.search + urlp.hash
    if (path.length > 15) {
      return urlp.host + path.slice(0, 13) + '...'
    }
    return urlp.host + path
  } catch {
    return url
  }
}

export function removeLinkCardUrl(text: string, url: string): string {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`\\s*${escaped}\\s*`), ' ').trim()
}

export function buildShortLinkText(text: string): string {
  const rt = new RichText({ text })
  rt.detectFacetsWithoutResolution()

  let result = ''
  for (const seg of rt.segments()) {
    if (seg.isLink() && seg.link) {
      result += toShortUrl(seg.link.uri)
    } else {
      result += seg.text
    }
  }
  return result
}
