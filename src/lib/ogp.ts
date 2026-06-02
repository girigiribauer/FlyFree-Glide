export interface LinkCard {
  url: string
  title: string
  description: string
  thumbUrl: string | null
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/)
  if (!match) return null
  return match[0].replace(/[.,!?。、)）」』\]>]+$/, '')
}

function sniffCharset(html: string): string {
  const m = html.match(/<meta[^>]+charset=["']?\s*([^"'\s;>]+)/i)
    ?? html.match(/content-type[^>]+charset=["']?\s*([^"'\s;>]+)/i)
  return m?.[1] ?? 'utf-8'
}

async function decodeResponse(res: Response): Promise<string> {
  const bytes = await res.arrayBuffer()
  const headerCharset = res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]
  if (headerCharset) return new TextDecoder(headerCharset).decode(bytes)
  const sniff = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return new TextDecoder(sniffCharset(sniff)).decode(bytes)
}

export async function fetchLinkCard(url: string): Promise<LinkCard | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return null
    const html = await decodeResponse(res)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const finalUrl = res.url || url

    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
      doc.querySelector('title')?.textContent ??
      ''

    const description =
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
      ''

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const thumbUrl = ogImage ? new URL(ogImage, finalUrl).href : null

    const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content')
    const resolvedUrl = ogUrl ? new URL(ogUrl, finalUrl).href : finalUrl

    return { url: resolvedUrl, title, description, thumbUrl }
  } catch {
    return null
  }
}
