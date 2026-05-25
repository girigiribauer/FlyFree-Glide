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

export async function fetchLinkCard(url: string): Promise<LinkCard | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const title =
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
      doc.querySelector('title')?.textContent ??
      ''

    const description =
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
      ''

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const thumbUrl = ogImage ? new URL(ogImage, url).href : null

    const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content')
    const resolvedUrl = ogUrl ? new URL(ogUrl, url).href : url

    return { url: resolvedUrl, title, description, thumbUrl }
  } catch {
    return null
  }
}
