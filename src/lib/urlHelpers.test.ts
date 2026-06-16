import { RichText } from '@atproto/api'
import { describe, expect, test } from 'vitest'

import { buildShortenedRichText, buildShortLinkText, toShortUrl } from './urlHelpers'

describe('toShortUrl', () => {
  test('ルートパスは protocol+slash を除去してホスト名のみ', () => {
    expect(toShortUrl('https://www.yahoo.co.jp/')).toBe('www.yahoo.co.jp')
  })

  test('パスあり URL は protocol を除去', () => {
    expect(toShortUrl('https://example.com/path')).toBe('example.com/path')
  })

  test('クエリ付き URL は protocol を除去', () => {
    expect(toShortUrl('https://example.com/path?q=1')).toBe('example.com/path?q=1')
  })

  test('15文字超のパスは13文字で切り詰め', () => {
    // path = '/very/long/path?query=value' (27 chars) → slice(0, 13) = '/very/long/pa'
    expect(toShortUrl('https://example.com/very/long/path?query=value')).toBe('example.com/very/long/pa...')
  })

  test('http URL も同様に処理', () => {
    expect(toShortUrl('http://example.com/')).toBe('example.com')
  })

  test('https/http 以外のスキームはそのまま返す', () => {
    expect(toShortUrl('ftp://example.com/')).toBe('ftp://example.com/')
  })

  test('無効な URL はそのまま返す', () => {
    expect(toShortUrl('not-a-url')).toBe('not-a-url')
  })
})

describe('buildShortLinkText', () => {
  test('URL のない平文はそのまま', () => {
    expect(buildShortLinkText('Hello world')).toBe('Hello world')
  })

  test('https URL が短縮される', () => {
    expect(buildShortLinkText('https://www.yahoo.co.jp/')).toBe('www.yahoo.co.jp')
  })

  test('テキスト中の URL が短縮され前後のテキストは保持される', () => {
    expect(buildShortLinkText('見てみて https://example.com/path おもしろい')).toBe(
      '見てみて example.com/path おもしろい',
    )
  })

  test('複数の URL をそれぞれ短縮する', () => {
    const input = 'https://www.yahoo.co.jp/ と https://example.com/path'
    const expected = 'www.yahoo.co.jp と example.com/path'
    expect(buildShortLinkText(input)).toBe(expected)
  })

  test('ハッシュタグはそのまま', () => {
    expect(buildShortLinkText('#hello world')).toBe('#hello world')
  })

  test('メンションはそのまま', () => {
    expect(buildShortLinkText('@user.bsky.social hello')).toBe('@user.bsky.social hello')
  })
})

describe('buildShortenedRichText', () => {
  // facet の byteStart/byteEnd が指す範囲のテキストを取り出す
  const sliceFacet = (text: string, facet: { index: { byteStart: number; byteEnd: number } }) => {
    const bytes = new TextEncoder().encode(text)
    return new TextDecoder().decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd))
  }

  const fromText = (input: string) => {
    const rt = new RichText({ text: input })
    rt.detectFacetsWithoutResolution()
    return buildShortenedRichText(rt)
  }

  test('リンク表示は短縮されるが facet のリンク先 URI は完全な URL を保持する', () => {
    const url = 'https://example.com/2024/11/some-long-article-slug'
    const { text, facets } = fromText(`テスト ${url} です`)

    expect(text).toBe('テスト example.com/2024/11/some... です')
    expect(facets).toHaveLength(1)
    const feature = facets[0].features[0] as { $type: string; uri: string }
    expect(feature.$type).toBe('app.bsky.richtext.facet#link')
    expect(feature.uri).toBe(url)
  })

  test('facet のバイト範囲が短縮後の表示テキストと一致する（マルチバイト混在）', () => {
    const { text, facets } = fromText('テスト https://example.com/very/long/path?query=value です #タグ')

    expect(sliceFacet(text, facets[0])).toBe('example.com/very/long/pa...')
    expect(sliceFacet(text, facets[1])).toBe('#タグ')
  })

  test('短縮されない短いリンクもリンク先 URI を保持する', () => {
    const url = 'https://example.com/path'
    const { text, facets } = fromText(url)

    expect(text).toBe('example.com/path')
    const feature = facets[0].features[0] as { uri: string }
    expect(feature.uri).toBe(url)
  })

  test('facet のないテキストはそのまま、facets は空', () => {
    const { text, facets } = fromText('ただのテキスト')

    expect(text).toBe('ただのテキスト')
    expect(facets).toHaveLength(0)
  })

  test('複数リンクでも各 facet のバイト範囲とリンク先が正しい（短縮後のオフセット累積）', () => {
    const url1 = 'https://example.com/2024/11/some-long-article-slug'
    const url2 = 'https://another.example.org/very/deep/nested/path'
    const { text, facets } = fromText(`A ${url1} と ${url2} B`)

    expect(facets).toHaveLength(2)
    // 1本目を短縮した後でも2本目のバイト範囲が正しくズレている
    expect(sliceFacet(text, facets[0])).toBe(toShortUrl(url1))
    expect(sliceFacet(text, facets[1])).toBe(toShortUrl(url2))
    // それぞれリンク先は完全 URL を保持
    expect((facets[0].features[0] as { uri: string }).uri).toBe(url1)
    expect((facets[1].features[0] as { uri: string }).uri).toBe(url2)
  })

  test('解決済みメンションの DID feature がバイト範囲とともに保持される', () => {
    const handle = '@alice.test'
    const byteEnd = new TextEncoder().encode(handle).length
    const rt = new RichText({
      text: `${handle} こんにちは`,
      facets: [
        {
          index: { byteStart: 0, byteEnd },
          features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' }],
        },
      ],
    })

    const { text, facets } = buildShortenedRichText(rt)

    expect(text).toBe(`${handle} こんにちは`)
    expect(facets).toHaveLength(1)
    const feature = facets[0].features[0] as { $type: string; did: string }
    expect(feature.$type).toBe('app.bsky.richtext.facet#mention')
    expect(feature.did).toBe('did:plc:alice')
    expect(sliceFacet(text, facets[0])).toBe(handle)
  })
})
