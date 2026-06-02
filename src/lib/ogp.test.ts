import { beforeEach, describe, expect, test, vi } from 'vitest'

import { extractFirstUrl, fetchLinkCard } from './ogp'

describe('extractFirstUrl', () => {
  test('URL のみのテキストからそのまま抽出する', () => {
    expect(extractFirstUrl('https://example.com')).toBe('https://example.com')
  })

  test('テキスト中の URL を抽出する', () => {
    expect(extractFirstUrl('これを見て https://example.com/path です')).toBe('https://example.com/path')
  })

  test('末尾のピリオドを除去する', () => {
    expect(extractFirstUrl('https://example.com.')).toBe('https://example.com')
  })

  test('末尾のカンマを除去する', () => {
    expect(extractFirstUrl('https://example.com,')).toBe('https://example.com')
  })

  test('末尾の感嘆符を除去する', () => {
    expect(extractFirstUrl('見て！ https://example.com!')).toBe('https://example.com')
  })

  test('末尾の全角句読点を除去する', () => {
    expect(extractFirstUrl('https://example.com。')).toBe('https://example.com')
    expect(extractFirstUrl('https://example.com、')).toBe('https://example.com')
  })

  test('末尾の閉じ括弧を除去する', () => {
    expect(extractFirstUrl('(https://example.com)')).toBe('https://example.com')
    expect(extractFirstUrl('「https://example.com」')).toBe('https://example.com')
  })

  test('URL 中のクエリパラメータは保持する', () => {
    expect(extractFirstUrl('https://example.com/path?foo=bar&baz=1')).toBe(
      'https://example.com/path?foo=bar&baz=1',
    )
  })

  test('URL 中のハッシュは保持する', () => {
    expect(extractFirstUrl('https://example.com/path#section')).toBe(
      'https://example.com/path#section',
    )
  })

  test('複数 URL がある場合は最初の URL を返す', () => {
    expect(extractFirstUrl('https://first.com と https://second.com')).toBe('https://first.com')
  })

  test('URL がない場合は null を返す', () => {
    expect(extractFirstUrl('URL のないテキスト')).toBeNull()
  })

  test('空文字列は null を返す', () => {
    expect(extractFirstUrl('')).toBeNull()
  })

  test('http も対応する', () => {
    expect(extractFirstUrl('http://example.com')).toBe('http://example.com')
  })
})

function makeMockFetch(overrides: Partial<Response> & { html: string }) {
  const buf = new TextEncoder().encode(overrides.html).buffer as ArrayBuffer
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    url: 'https://example.com',
    arrayBuffer: () => Promise.resolve(buf),
    headers: new Headers({ 'content-type': 'text/html' }),
    ...overrides,
  } as Response)
}

describe('fetchLinkCard — charset', () => {
  beforeEach(() => vi.restoreAllMocks())

  function mockFetch(html: string, contentType = 'text/html') {
    makeMockFetch({ html, headers: new Headers({ 'content-type': contentType }) })
  }

  function mockFetchWithEncoding(html: string, charset: string) {
    makeMockFetch({ html, headers: new Headers({ 'content-type': `text/html; charset=${charset}` }) })
  }

  test('UTF-8 ページのタイトルを正しく取得する', async () => {
    mockFetch('<html><head><meta property="og:title" content="テストタイトル"><meta property="og:image" content="https://example.com/img.png"></head></html>')
    const card = await fetchLinkCard('https://example.com')
    expect(card?.title).toBe('テストタイトル')
  })

  test('Content-Type ヘッダーの charset でデコードする', async () => {
    const title = 'タイトル'
    const html = `<html><head><meta property="og:title" content="${title}"><meta property="og:image" content="https://example.com/img.png"></head></html>`
    mockFetchWithEncoding(html, 'utf-8')
    const card = await fetchLinkCard('https://example.com')
    expect(card?.title).toBe(title)
  })

  test('meta charset 宣言に従ってデコードする', async () => {
    const title = 'Charset Test'
    const html = `<html><head><meta charset="utf-8"><meta property="og:title" content="${title}"><meta property="og:image" content="https://example.com/img.png"></head></html>`
    mockFetch(html)
    const card = await fetchLinkCard('https://example.com')
    expect(card?.title).toBe(title)
  })
})

describe('fetchLinkCard — OGP パース', () => {
  beforeEach(() => vi.restoreAllMocks())

  test('og:image の絶対 URL をそのまま thumbUrl として返す', async () => {
    makeMockFetch({
      html: '<html><head><meta property="og:image" content="https://cdn.example.com/img.png"></head></html>',
    })
    const card = await fetchLinkCard('https://example.com')
    expect(card?.thumbUrl).toBe('https://cdn.example.com/img.png')
  })

  test('og:image が相対パスのとき res.url を基準に絶対 URL へ解決する', async () => {
    makeMockFetch({
      url: 'https://example.com/blog/post/',
      html: '<html><head><meta property="og:image" content="/assets/cover.png"></head></html>',
    })
    const card = await fetchLinkCard('https://example.com/blog/post')
    expect(card?.thumbUrl).toBe('https://example.com/assets/cover.png')
  })

  test('og:image がない HTML では thumbUrl が null', async () => {
    makeMockFetch({
      html: '<html><head><meta property="og:title" content="タイトル"></head></html>',
    })
    const card = await fetchLinkCard('https://example.com')
    expect(card?.thumbUrl).toBeNull()
  })

  test('og:title がなければ <title> にフォールバックする', async () => {
    makeMockFetch({
      html: '<html><head><title>ページタイトル</title></head></html>',
    })
    const card = await fetchLinkCard('https://example.com')
    expect(card?.title).toBe('ページタイトル')
  })

  test('og:url を card.url として使う', async () => {
    makeMockFetch({
      html: '<html><head><meta property="og:url" content="https://example.com/canonical/"></head></html>',
    })
    const card = await fetchLinkCard('https://example.com/other')
    expect(card?.url).toBe('https://example.com/canonical/')
  })

  test('og:url がなければ res.url を card.url として使う', async () => {
    makeMockFetch({
      url: 'https://example.com/redirected/',
      html: '<html><head></head></html>',
    })
    const card = await fetchLinkCard('https://example.com/original')
    expect(card?.url).toBe('https://example.com/redirected/')
  })

  test('res.ok が false なら null を返す', async () => {
    makeMockFetch({ ok: false, html: '<html><head></head></html>' })
    const card = await fetchLinkCard('https://example.com')
    expect(card).toBeNull()
  })

  test('fetch が例外を投げたら null を返す', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const card = await fetchLinkCard('https://example.com')
    expect(card).toBeNull()
  })
})
