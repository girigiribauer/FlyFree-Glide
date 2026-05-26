import { RichText } from '@atproto/api'

import { MAX_LINK_THUMB_SIZE } from './constants'
import { type OptimizedImage, optimizeImage } from './image'
import { extractFirstUrl, fetchLinkCard } from './ogp'

export type { OptimizedImage as PostImage }

export interface AgentLike {
  post(record: { text: string; [k: string]: unknown }): Promise<{ uri: string }>
  uploadBlob(
    data: Uint8Array | Blob,
    options?: { encoding?: string },
  ): Promise<{
    success: boolean
    data: { blob: { ref: { toString(): string }; mimeType: string; size: number } }
  }>
  com: {
    atproto: {
      identity: {
        resolveHandle(params: { handle: string }): Promise<{ data: { did: string } } | undefined>
      }
    }
  }
}

function removeLinkCardUrl(text: string, url: string): string {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`\\s*${escaped}\\s*`), ' ').trim()
}

function atUriToBskyUrl(uri: string): string {
  const match = uri.match(/at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([^/]+)/)
  if (!match) throw new Error(`Unexpected post URI: ${uri}`)
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`
}

async function buildImageEmbed(agent: AgentLike, images: OptimizedImage[]) {
  const uploaded = await Promise.all(
    images.map(async ({ data, mimeType, width, height }) => {
      const res = await agent.uploadBlob(data, { encoding: mimeType })
      return {
        alt: '',
        image: {
          $type: 'blob',
          ref: { $link: res.data.blob.ref.toString() },
          mimeType: res.data.blob.mimeType,
          size: res.data.blob.size,
        },
        aspectRatio: { width, height },
      }
    }),
  )
  return { $type: 'app.bsky.embed.images', images: uploaded }
}

async function buildLinkCardEmbed(agent: AgentLike, text: string) {
  const url = extractFirstUrl(text)
  if (!url) return undefined

  const card = await fetchLinkCard(url)
  if (!card) return undefined

  let thumb: { $type: string; ref: { $link: string }; mimeType: string; size: number } | undefined
  if (card.thumbUrl) {
    try {
      const res = await fetch(card.thumbUrl)
      const blob = await res.blob()
      const { data, mimeType } = await optimizeImage(blob, MAX_LINK_THUMB_SIZE)
      const uploaded = await agent.uploadBlob(data, { encoding: mimeType })
      if (uploaded.success) {
        thumb = {
          $type: 'blob',
          ref: { $link: uploaded.data.blob.ref.toString() },
          mimeType: uploaded.data.blob.mimeType,
          size: uploaded.data.blob.size,
        }
      }
    } catch {
      // サムネイルアップロード失敗時はカードのみで投稿
    }
  }

  return {
    $type: 'app.bsky.embed.external',
    external: {
      uri: card.url,
      title: card.title,
      description: card.description,
      ...(thumb && { thumb }),
    },
  }
}

export async function postToBluesky(
  agent: AgentLike,
  text: string,
  images: OptimizedImage[] = [],
): Promise<string> {
  const trimmed = text.trim()

  // 画像とリンクカードは排他
  const linkUrl = images.length === 0 ? extractFirstUrl(trimmed) : undefined
  const embed =
    images.length > 0
      ? await buildImageEmbed(agent, images)
      : await buildLinkCardEmbed(agent, trimmed)

  // リンクカード生成時はテキストから URL を除去（Bluesky 公式クライアントと同様の挙動）
  const finalText =
    embed?.$type === 'app.bsky.embed.external' && linkUrl
      ? removeLinkCardUrl(trimmed, linkUrl)
      : trimmed

  const rt = new RichText({ text: finalText })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await rt.detectFacets(agent as any)

  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    ...(embed && { embed }),
    via: 'FlyFree Glide',
  })

  return atUriToBskyUrl(result.uri)
}
