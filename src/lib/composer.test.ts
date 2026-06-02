import { describe, expect, test } from 'vitest'

import { canPost, countGraphemes, isOverLimit, MAX_GRAPHEMES, remainingGraphemes } from './composer'

describe('countGraphemes', () => {
  test('空文字は0', () => {
    expect(countGraphemes('')).toBe(0)
  })

  test('ASCII 文字は1文字1グラフィーム', () => {
    expect(countGraphemes('hello')).toBe(5)
  })

  test('日本語は1文字1グラフィーム', () => {
    expect(countGraphemes('日本語')).toBe(3)
  })

  test('基本的な絵文字は1グラフィーム', () => {
    expect(countGraphemes('👍')).toBe(1)
  })

  test('スキントーン修飾子付き絵文字は1グラフィーム', () => {
    expect(countGraphemes('👍🏽')).toBe(1)
  })

  test('ZWJ シーケンス（家族絵文字）は1グラフィーム', () => {
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1)
  })

  test('複数グラフィームを正しくカウントする', () => {
    expect(countGraphemes('Hello 👋 世界')).toBe(10)
  })

  test('https URL はホスト+パス形式（短縮形）でカウントされる', () => {
    // 'https://example.com/path' → 'example.com/path' (16 chars)
    expect(countGraphemes('https://example.com/path')).toBe(16)
  })

  test('ルートパス URL はホスト名のみでカウントされる', () => {
    // 'https://www.yahoo.co.jp/' → 'www.yahoo.co.jp' (15 chars)
    expect(countGraphemes('https://www.yahoo.co.jp/')).toBe(15)
  })
})

describe('isOverLimit', () => {
  test(`${MAX_GRAPHEMES} グラフィームは制限以内`, () => {
    expect(isOverLimit('a'.repeat(MAX_GRAPHEMES))).toBe(false)
  })

  test(`${MAX_GRAPHEMES + 1} グラフィームは制限超過`, () => {
    expect(isOverLimit('a'.repeat(MAX_GRAPHEMES + 1))).toBe(true)
  })

  test('絵文字300個は制限以内', () => {
    expect(isOverLimit('👍'.repeat(MAX_GRAPHEMES))).toBe(false)
  })

  test('絵文字301個は制限超過', () => {
    expect(isOverLimit('👍'.repeat(MAX_GRAPHEMES + 1))).toBe(true)
  })
})

describe('remainingGraphemes', () => {
  test('空文字は300残り', () => {
    expect(remainingGraphemes('')).toBe(300)
  })

  test('10文字なら290残り', () => {
    expect(remainingGraphemes('a'.repeat(10))).toBe(290)
  })

  test('制限超過はマイナスになる', () => {
    expect(remainingGraphemes('a'.repeat(MAX_GRAPHEMES + 5))).toBe(-5)
  })
})

describe('canPost', () => {
  test('テキストがあれば投稿できる', () => {
    expect(canPost('hello', 0)).toBe(true)
  })

  test('画像があれば投稿できる', () => {
    expect(canPost('', 1)).toBe(true)
  })

  test('テキストと画像の両方があれば投稿できる', () => {
    expect(canPost('hello', 2)).toBe(true)
  })

  test('テキストも画像もなければ投稿できない', () => {
    expect(canPost('', 0)).toBe(false)
  })

  test('空白のみのテキストは投稿できない', () => {
    expect(canPost('   ', 0)).toBe(false)
  })

  test('制限超過テキストは投稿できない', () => {
    expect(canPost('a'.repeat(MAX_GRAPHEMES + 1), 0)).toBe(false)
  })

  test('制限超過でも画像があれば投稿できない', () => {
    expect(canPost('a'.repeat(MAX_GRAPHEMES + 1), 1)).toBe(false)
  })

  test('limitText が制限内なら本文が超過でも投稿できる（リンクカードURL除外後）', () => {
    const overLimit = 'a'.repeat(MAX_GRAPHEMES + 1)
    const withinLimit = 'a'.repeat(MAX_GRAPHEMES)
    expect(canPost(overLimit, 0, withinLimit)).toBe(true)
  })

  test('limitText が超過なら投稿できない', () => {
    expect(canPost('hello', 0, 'a'.repeat(MAX_GRAPHEMES + 1))).toBe(false)
  })
})
