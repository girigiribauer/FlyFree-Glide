import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { OptimizedImage } from './image'
import { postToBluesky } from './post'

vi.mock('./ogp', () => ({
  extractFirstUrl: vi.fn((text: string) => {
    const match = text.match(/https?:\/\/[^\s]+/)
    return match ? match[0] : null
  }),
  fetchLinkCard: vi.fn().mockResolvedValue(null),
}))

import { fetchLinkCard } from './ogp'

const TEST_URI = 'at://did:plc:test/app.bsky.feed.post/testkey'
const TEST_URL = 'https://bsky.app/profile/did:plc:test/post/testkey'

function mockAgent(postImpl = vi.fn().mockResolvedValue({ uri: TEST_URI })) {
  return {
    post: postImpl,
    uploadBlob: vi.fn().mockResolvedValue({
      success: true,
      data: {
        blob: {
          ref: { toString: () => 'bafytest' },
          mimeType: 'image/jpeg',
          size: 100,
        },
      },
    }),
    com: {
      atproto: {
        identity: {
          resolveHandle: vi.fn().mockResolvedValue({ data: { did: 'did:plc:test' } }),
        },
        repo: {
          createRecord: vi.fn().mockResolvedValue({ data: { uri: TEST_URI, cid: 'bafytest' } }),
        },
      },
    },
  }
}

function makeImage(overrides?: Partial<OptimizedImage>): OptimizedImage {
  return {
    data: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    ...overrides,
  }
}

describe('postToBluesky', () => {
  beforeEach(() => vi.clearAllMocks())

  test('投稿後に bsky.app の URL を返す', async () => {
    const agent = mockAgent()
    const url = await postToBluesky(agent, 'hello')
    expect(url).toBe(TEST_URL)
  })

  test('via: FlyFree Glide が付与される', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello')
    expect(agent.post).toHaveBeenCalledWith(expect.objectContaining({ via: 'FlyFree Glide' }))
  })

  test('テキストが trim される', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, '  hello  ')
    expect(agent.post).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }))
  })

  test('URL が facet として付与される', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com を見てください')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const linkFacet = record.facets?.find((f: { features: { $type: string }[] }) =>
      f.features.some((feat) => feat.$type === 'app.bsky.richtext.facet#link'),
    )
    expect(linkFacet).toBeDefined()
  })

  test('長い URL でも facet のリンク先は完全な URL を保持する（表示テキストのみ短縮）', async () => {
    const agent = mockAgent()
    const url = 'https://example.com/2024/11/some-long-article-slug'
    await postToBluesky(agent, `これ見て ${url}`)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const linkFacet = record.facets?.find((f: { features: { $type: string; uri?: string }[] }) =>
      f.features.some((feat) => feat.$type === 'app.bsky.richtext.facet#link'),
    )
    expect(linkFacet).toBeDefined()
    expect(linkFacet.features[0].uri).toBe(url)
    // 投稿テキスト側は短縮されている
    expect(record.text).toContain('example.com/2024/11/some...')
    expect(record.text).not.toContain(url)
  })

  test('URL を含むテキストでリンクカード embed が付与される', async () => {
    vi.mocked(fetchLinkCard).mockResolvedValueOnce({
      url: 'https://example.com',
      title: 'Test Title',
      description: 'Test Description',
      thumbUrl: null,
    })
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com を見てください')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed).toMatchObject({
      $type: 'app.bsky.embed.external',
      external: expect.objectContaining({
        uri: 'https://example.com',
        title: 'Test Title',
      }),
    })
  })

  test('OGP 取得失敗時は embed なしで投稿される', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com を見てください')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed).toBeUndefined()
  })

  test('画像があるときは images embed が付与される', async () => {
    const agent = mockAgent()
    const images = [makeImage({ width: 1280, height: 720 })]
    await postToBluesky(agent, 'テスト投稿', images)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed).toMatchObject({
      $type: 'app.bsky.embed.images',
      images: [expect.objectContaining({ aspectRatio: { width: 1280, height: 720 } })],
    })
  })

  test('画像があるときはリンクカード embed は付与されない', async () => {
    const agent = mockAgent()
    const images = [makeImage()]
    await postToBluesky(agent, 'https://example.com', images)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed?.$type).toBe('app.bsky.embed.images')
    expect(fetchLinkCard).not.toHaveBeenCalled()
  })

  test('複数画像をアップロードする', async () => {
    const agent = mockAgent()
    const images = [makeImage(), makeImage(), makeImage()]
    await postToBluesky(agent, 'テスト', images)
    expect(agent.uploadBlob).toHaveBeenCalledTimes(3)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed.images).toHaveLength(3)
  })

  test('agent.post が失敗したらエラーが伝播する', async () => {
    const agent = mockAgent(vi.fn().mockRejectedValue(new Error('network error')))
    await expect(postToBluesky(agent, 'hello')).rejects.toThrow('network error')
  })

  test('リンクカード生成時にテキストから URL が除去される', async () => {
    vi.mocked(fetchLinkCard).mockResolvedValueOnce({
      url: 'https://example.com',
      title: 'Test',
      description: '',
      thumbUrl: null,
    })
    const agent = mockAgent()
    await postToBluesky(agent, 'Check this out https://example.com')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toBe('Check this out')
  })

  test('URL のみのテキストはリンクカード生成後に空になる', async () => {
    vi.mocked(fetchLinkCard).mockResolvedValueOnce({
      url: 'https://example.com',
      title: 'Test',
      description: '',
      thumbUrl: null,
    })
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toBe('')
  })

  test('リンクカード取得失敗時は URL が短縮形でテキストに残る', async () => {
    vi.mocked(fetchLinkCard).mockResolvedValueOnce(null)
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com を見てください')
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toContain('example.com')
  })

  test('画像投稿時は URL が短縮形でテキストに残る', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com', [makeImage()])
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toBe('example.com')
  })

  test('linkCard: null のとき URL があってもリンクカード embed が付与されない', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com', [], null)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed).toBeUndefined()
    expect(fetchLinkCard).not.toHaveBeenCalled()
  })

  test('linkCard: null のとき URL が短縮形でテキストに残る', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'https://example.com', [], null)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toBe('example.com')
  })

  test('linkCard に事前フェッチ済みカードを渡すと fetchLinkCard を呼ばずに embed が付与される', async () => {
    const agent = mockAgent()
    const card = { url: 'https://example.com', title: 'Pre-fetched', description: 'Desc', thumbUrl: null }
    await postToBluesky(agent, 'https://example.com', [], card)
    expect(fetchLinkCard).not.toHaveBeenCalled()
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.embed).toMatchObject({
      $type: 'app.bsky.embed.external',
      external: expect.objectContaining({ title: 'Pre-fetched' }),
    })
  })

  test('langs オプションが投稿レコードに含まれる', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { langs: ['ja'] })
    expect(agent.post).toHaveBeenCalledWith(expect.objectContaining({ langs: ['ja'] }))
  })

  test('langs が空配列のとき langs フィールドは付与されない', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { langs: [] })
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.langs).toBeUndefined()
  })

  test('threadgate: nobody のとき createRecord が呼ばれる', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, {
      threadgate: { type: 'nobody', allowMention: false, allowFollowing: false, allowFollower: false },
    })
    expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'app.bsky.feed.threadgate' })
    )
  })

  test('threadgate: everybody のとき createRecord は呼ばれない', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, {
      threadgate: { type: 'everybody', allowMention: false, allowFollowing: false, allowFollower: false },
    })
    expect(agent.com.atproto.repo.createRecord).not.toHaveBeenCalled()
  })

  test('disableEmbeds: true のとき postgate createRecord が呼ばれる', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { disableEmbeds: true })
    expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'app.bsky.feed.postgate' })
    )
  })

  test('labels オプションが投稿レコードに含まれる', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { labels: ['sexual'] })
    expect(agent.post).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: { $type: 'com.atproto.label.defs#selfLabels', values: [{ val: 'sexual' }] },
      })
    )
  })

  test('labels: [] のとき labels フィールドは付与されない', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { labels: [] })
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.labels).toBeUndefined()
  })

  test('複数ラベルがすべて selfLabels に含まれる', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, { labels: ['sexual', 'graphic-media'] })
    expect(agent.post).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: {
          $type: 'com.atproto.label.defs#selfLabels',
          values: expect.arrayContaining([{ val: 'sexual' }, { val: 'graphic-media' }]),
        },
      })
    )
  })

  test('threadgate: custom の allow フラグが createRecord に反映される', async () => {
    const agent = mockAgent()
    await postToBluesky(agent, 'hello', [], undefined, {
      threadgate: { type: 'custom', allowMention: true, allowFollowing: true, allowFollower: false },
    })
    const call = (agent.com.atproto.repo.createRecord as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.collection).toBe('app.bsky.feed.threadgate')
    expect(call.record.allow).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $type: 'app.bsky.feed.threadgate#mentionRule' }),
        expect.objectContaining({ $type: 'app.bsky.feed.threadgate#followingRule' }),
      ])
    )
    expect(call.record.allow).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $type: 'app.bsky.feed.threadgate#followerRule' }),
      ])
    )
  })

  test('linkCard に事前フェッチ済みカードを渡すと URL がテキストから除去される', async () => {
    const agent = mockAgent()
    const card = { url: 'https://example.com', title: 'Pre-fetched', description: '', thumbUrl: null }
    await postToBluesky(agent, 'Check this out https://example.com', [], card)
    const record = (agent.post as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(record.text).toBe('Check this out')
  })
})
