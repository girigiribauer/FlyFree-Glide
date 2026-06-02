import { describe, expect, test } from 'vitest'

import { buildShortLinkText, toShortUrl } from './urlHelpers'

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
