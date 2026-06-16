import { type Facet, RichText } from '@atproto/api'

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

export interface ShortenedRichText {
  text: string
  facets: Facet[]
}

/**
 * detectFacets 済みの RichText から、リンク表示だけを短縮しつつ
 * 元の facet（リンク先 URI・解決済みメンション DID・タグ）を保持した
 * テキストと facet 列を生成する。
 *
 * リンク本文を短縮した後にバイトオフセットを再計算するため、
 * リンク先 URI が短縮テキストから誤って導出されることがない。
 */
export function buildShortenedRichText(rt: RichText): ShortenedRichText {
  const encoder = new TextEncoder()
  let text = ''
  let byteOffset = 0
  const facets: Facet[] = []

  for (const seg of rt.segments()) {
    const display = seg.isLink() && seg.link ? toShortUrl(seg.link.uri) : seg.text
    const byteStart = byteOffset
    byteOffset += encoder.encode(display).length
    text += display
    if (seg.facet) {
      facets.push({ ...seg.facet, index: { byteStart, byteEnd: byteOffset } })
    }
  }

  return { text, facets }
}
