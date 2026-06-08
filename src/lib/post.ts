import { type AtpBaseClient, RichText } from '@atproto/api'

import { MAX_LINK_THUMB_SIZE } from './constants'
import { type OptimizedImage, optimizeImage } from './image'
import { extractFirstUrl, fetchLinkCard, type LinkCard } from './ogp'
import type { ContentLabel, ThreadgateSettings } from './settings'
import { buildShortLinkText, removeLinkCardUrl } from './urlHelpers'

export type { OptimizedImage as PostImage }

export interface PostOptions {
  langs?: string[]
  threadgate?: ThreadgateSettings
  disableEmbeds?: boolean
  labels?: ContentLabel[]
}

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
      repo: {
        createRecord(params: {
          repo: string
          collection: string
          rkey: string
          record: Record<string, unknown>
        }): Promise<{ data: { uri: string; cid: string } }>
      }
    }
  }
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

async function uploadThumb(agent: AgentLike, thumbUrl: string) {
  try {
    const res = await fetch(thumbUrl)
    if (!res.ok) return undefined
    const blob = await res.blob()
    const { data, mimeType } = await optimizeImage(blob, MAX_LINK_THUMB_SIZE)
    const uploaded = await agent.uploadBlob(data, { encoding: mimeType })
    if (uploaded.success) {
      return {
        $type: 'blob',
        ref: { $link: uploaded.data.blob.ref.toString() },
        mimeType: uploaded.data.blob.mimeType,
        size: uploaded.data.blob.size,
      }
    }
  } catch {}
  return undefined
}

async function buildLinkCardEmbedFromCard(agent: AgentLike, card: LinkCard) {
  const thumb = card.thumbUrl ? await uploadThumb(agent, card.thumbUrl) : undefined
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

async function buildLinkCardEmbed(agent: AgentLike, text: string) {
  const url = extractFirstUrl(text)
  if (!url) return undefined
  const card = await fetchLinkCard(url)
  if (!card) return undefined
  return buildLinkCardEmbedFromCard(agent, card)
}

export async function postToBluesky(
  agent: AgentLike,
  text: string,
  images: OptimizedImage[] = [],
  linkCard?: LinkCard | null,
  options?: PostOptions,
): Promise<string> {
  const trimmed = text.trim()

  // 画像とリンクカードは排他
  const linkUrl = images.length === 0 ? extractFirstUrl(trimmed) : undefined
  let embed: { $type: string; [k: string]: unknown } | undefined
  if (images.length > 0) {
    embed = await buildImageEmbed(agent, images)
  } else if (linkCard === null) {
    embed = undefined
  } else if (linkCard !== undefined) {
    embed = await buildLinkCardEmbedFromCard(agent, linkCard)
  } else {
    embed = await buildLinkCardEmbed(agent, trimmed)
  }

  // リンクカード生成時はテキストから URL を除去（Bluesky 公式クライアントと同様の挙動）
  const finalText =
    embed?.$type === 'app.bsky.embed.external' && linkUrl
      ? removeLinkCardUrl(trimmed, linkUrl)
      : trimmed

  const rt = new RichText({ text: buildShortLinkText(finalText) })
  await rt.detectFacets(agent as unknown as AtpBaseClient)

  const langs = options?.langs?.length ? options.langs : undefined
  const labelValues = options?.labels?.length
    ? { $type: 'com.atproto.label.defs#selfLabels', values: options.labels.map(val => ({ val })) }
    : undefined

  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    ...(langs && { langs }),
    ...(embed && { embed }),
    ...(labelValues && { labels: labelValues }),
    via: 'FlyFree Glide',
  })

  const postUri = result.uri
  const uriMatch = postUri.match(/at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/([^/]+)/)
  const did = uriMatch![1]
  const rkey = uriMatch![2]
  const createdAt = new Date().toISOString()

  const threadgate = options?.threadgate
  if (threadgate && threadgate.type !== 'everybody') {
    const allow = threadgate.type === 'nobody' ? [] : [
      ...(threadgate.allowMention ? [{ $type: 'app.bsky.feed.threadgate#mentionRule' }] : []),
      ...(threadgate.allowFollowing ? [{ $type: 'app.bsky.feed.threadgate#followingRule' }] : []),
      ...(threadgate.allowFollower ? [{ $type: 'app.bsky.feed.threadgate#followerRule' }] : []),
    ]
    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'app.bsky.feed.threadgate',
      rkey,
      record: { $type: 'app.bsky.feed.threadgate', post: postUri, allow, createdAt },
    })
  }

  if (options?.disableEmbeds) {
    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'app.bsky.feed.postgate',
      rkey,
      record: { $type: 'app.bsky.feed.postgate', post: postUri, disableEmbeds: true, createdAt },
    })
  }

  return atUriToBskyUrl(postUri)
}
