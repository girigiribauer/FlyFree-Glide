import { describe, expect, test } from 'vitest'

import { extractFirstUrl } from './ogp'

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
