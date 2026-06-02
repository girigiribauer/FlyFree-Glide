import { describe, expect, test } from 'vitest'

import { buildMirrorHtml, parseSegments } from './richtext'

// ── parseSegments ─────────────────────────────────────────────────────────────

describe('parseSegments — ハッシュタグ', () => {
  test('基本的なハッシュタグ', () => {
    const segs = parseSegments('#hello')
    expect(segs).toEqual([{ kind: 'tag', text: '#hello' }])
  })

  test('日本語ハッシュタグ', () => {
    const segs = parseSegments('#日本語')
    expect(segs).toEqual([{ kind: 'tag', text: '#日本語' }])
  })

  test('英数字混在', () => {
    const segs = parseSegments('#testing123')
    expect(segs).toEqual([{ kind: 'tag', text: '#testing123' }])
  })

  test('数字始まり（文字を含む）', () => {
    const segs = parseSegments('#123abc')
    expect(segs).toEqual([{ kind: 'tag', text: '#123abc' }])
  })

  test('全角 ＃', () => {
    const segs = parseSegments('＃hello')
    expect(segs).toEqual([{ kind: 'tag', text: '＃hello' }])
  })

  test('空白の後のハッシュタグ', () => {
    const segs = parseSegments('text #hello')
    expect(segs).toContainEqual({ kind: 'tag', text: '#hello' })
  })

  test('改行の後のハッシュタグ', () => {
    const segs = parseSegments('text\n#hello')
    expect(segs).toContainEqual({ kind: 'tag', text: '#hello' })
  })

  test('複数のハッシュタグ', () => {
    const segs = parseSegments('#foo #bar')
    const tags = segs.filter(s => typeof s !== 'string')
    expect(tags).toHaveLength(2)
    expect(tags[0]).toEqual({ kind: 'tag', text: '#foo' })
    expect(tags[1]).toEqual({ kind: 'tag', text: '#bar' })
  })

  test('末尾の句読点を除いたテキスト範囲', () => {
    // #foo! → ファセットは #foo のみ。! は通常テキスト
    const segs = parseSegments('#foo!')
    const tag = segs.find(s => typeof s !== 'string')
    expect(tag).toEqual({ kind: 'tag', text: '#foo' })
  })
})

describe('parseSegments — ハッシュタグにならないケース', () => {
  test('単語の途中の # は対象外', () => {
    const segs = parseSegments('foo#bar')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('URL のフラグメント識別子は対象外', () => {
    const segs = parseSegments('https://example.com/#section')
    const tags = segs.filter(s => typeof s !== 'string' && s.kind === 'tag')
    expect(tags).toHaveLength(0)
  })

  test('数字のみは対象外', () => {
    const segs = parseSegments('#123')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('# 単体は対象外', () => {
    const segs = parseSegments('#')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('# の直後にスペースは対象外', () => {
    const segs = parseSegments('# hello')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('65文字以上は対象外', () => {
    const long = '#' + 'a'.repeat(65)
    const segs = parseSegments(long)
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('64文字はギリギリ有効', () => {
    const valid = '#' + 'a'.repeat(64)
    const segs = parseSegments(valid)
    expect(segs.some(s => typeof s !== 'string' && s.kind === 'tag')).toBe(true)
  })
})

// ── parseSegments — URL ────────────────────────────────────────────────────────

describe('parseSegments — URL', () => {
  test('https URL', () => {
    const segs = parseSegments('https://example.com')
    expect(segs).toContainEqual({ kind: 'link', text: 'https://example.com' })
  })

  test('http URL', () => {
    const segs = parseSegments('http://example.com')
    expect(segs).toContainEqual({ kind: 'link', text: 'http://example.com' })
  })

  test('裸のドメイン（有効 TLD）', () => {
    const segs = parseSegments('example.com')
    expect(segs).toContainEqual({ kind: 'link', text: 'example.com' })
  })

  test('パス・クエリ・フラグメント付き URL', () => {
    const segs = parseSegments('https://example.com/path?q=1#frag')
    expect(segs).toContainEqual({ kind: 'link', text: 'https://example.com/path?q=1#frag' })
  })

  test('末尾のピリオドは URL に含まれない', () => {
    const segs = parseSegments('visit https://example.com.')
    const link = segs.find(s => typeof s !== 'string' && s.kind === 'link')
    expect(link).toEqual({ kind: 'link', text: 'https://example.com' })
  })

  test('括弧の外の ) は URL に含まれない', () => {
    const segs = parseSegments('https://example.com)')
    const link = segs.find(s => typeof s !== 'string' && s.kind === 'link')
    expect(link).toEqual({ kind: 'link', text: 'https://example.com' })
  })

  test('URL とハッシュタグが共存', () => {
    const segs = parseSegments('https://example.com #tag')
    const kinds = segs.filter(s => typeof s !== 'string').map(s => (s as { kind: string }).kind)
    expect(kinds).toContain('link')
    expect(kinds).toContain('tag')
  })

  test('単語の中の # は URL のフラグメントとして URL に含まれる', () => {
    const segs = parseSegments('https://example.com/path#section')
    expect(segs).toContainEqual({ kind: 'link', text: 'https://example.com/path#section' })
  })
})

// ── parseSegments — メンション ────────────────────────────────────────────────

describe('parseSegments — メンション', () => {
  test('有効なハンドル（TLD あり）', () => {
    const segs = parseSegments('@user.bsky.social')
    expect(segs).toContainEqual({ kind: 'mention', text: '@user.bsky.social' })
  })

  test('空白の後のメンション', () => {
    const segs = parseSegments('hello @user.bsky.social')
    expect(segs).toContainEqual({ kind: 'mention', text: '@user.bsky.social' })
  })

  test('括弧の前のメンション', () => {
    const segs = parseSegments('(@user.bsky.social)')
    expect(segs).toContainEqual({ kind: 'mention', text: '@user.bsky.social' })
  })

  test('.test ドメインはメンション扱い', () => {
    const segs = parseSegments('@user.test')
    expect(segs).toContainEqual({ kind: 'mention', text: '@user.test' })
  })

  test('TLD なしは対象外', () => {
    const segs = parseSegments('@user')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })

  test('メールアドレスは対象外', () => {
    const segs = parseSegments('foo@bar.com')
    const mentions = segs.filter(s => typeof s !== 'string' && s.kind === 'mention')
    expect(mentions).toHaveLength(0)
  })

  test('無効な TLD は対象外', () => {
    const segs = parseSegments('@user.invalid')
    expect(segs.every(s => typeof s === 'string')).toBe(true)
  })
})

// ── buildMirrorHtml ───────────────────────────────────────────────────────────

describe('buildMirrorHtml', () => {
  const css = { tag: 'tag-class' }

  test('プレーンテキストはそのまま', () => {
    expect(buildMirrorHtml('hello', css)).toBe('hello')
  })

  test('ハッシュタグを span でラップする', () => {
    expect(buildMirrorHtml('#hello', css)).toBe('<span class="tag-class">#hello</span>')
  })

  test('HTML 特殊文字をエスケープする', () => {
    expect(buildMirrorHtml('<b>&amp;</b>', css)).toBe('&lt;b&gt;&amp;amp;&lt;/b&gt;')
  })

  test('ハッシュタグ内の < > & もエスケープされる', () => {
    // #foo<bar は < を含む単一タグ（空白区切りでないため）
    const html = buildMirrorHtml('#foo<bar', css)
    expect(html).toBe('<span class="tag-class">#foo&lt;bar</span>')
  })

  test('末尾改行に空白を付加する', () => {
    expect(buildMirrorHtml('hello\n', css)).toBe('hello\n ')
  })

  test('cssClasses に tag が未指定のときは span なし', () => {
    expect(buildMirrorHtml('#hello', {})).toBe('#hello')
  })
})
