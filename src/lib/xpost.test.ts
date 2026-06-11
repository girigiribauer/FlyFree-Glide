import { describe, expect, test } from 'vitest'

import { composeCliffhangerText, countXChars, uint8ToBase64 } from './xpost'

const URL = 'https://bsky.app/profile/test.bsky.social/post/abc123'

describe('composeCliffhangerText', () => {
  test('50グラフェム未満のテキストにも Bluesky URL を付ける', () => {
    const text = 'a'.repeat(49)
    expect(composeCliffhangerText(text, URL)).toBe(text + '\n' + URL)
  })

  test('ちょうど50グラフェムで発動し前半のみになる', () => {
    const text = 'a'.repeat(50)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(25) + '... ' + URL)
  })

  test('ASCIIテキストは半分の位置で切る', () => {
    const text = 'a'.repeat(100)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(50) + '... ' + URL)
  })

  test('日本語テキストはX上限内に収まるよう切る', () => {
    // 300グラフェムの日本語: 半分=150だがCJK×2で300X文字 > 253(上限-... -URL)
    // → X上限側でキャップされる
    const text = 'あ'.repeat(300)
    const result = composeCliffhangerText(text, URL)
    expect(result.endsWith('... ' + URL)).toBe(true)
    const textPart = result.slice(0, result.indexOf('... '))
    // CJK×2なので textPart.length × 2 <= 253
    expect(textPart.length * 2).toBeLessThanOrEqual(253)
  })

  test('テキスト部分 + "... " + URL がX上限を超えない', () => {
    const text = 'あ'.repeat(200)
    const result = composeCliffhangerText(text, URL)
    const textPart = result.slice(0, result.indexOf('... '))
    const xWeight = [...textPart].reduce((sum, ch) => {
      const cp = ch.codePointAt(0) ?? 0
      return sum + (cp >= 0x3041 && cp <= 0x9FFF ? 2 : 1)
    }, 0)
    expect(xWeight + 4 + 23).toBeLessThanOrEqual(280)
  })

  test('テキスト中に URL があっても X 上限内に収まる', () => {
    // URL(23) + ASCII × 49 = 72 X文字 → 50グラフェム以上なので発動
    // 前半は URL(1グラフェム)+ASCII(24グラフェム) = 25グラフェムが上限
    const text = 'https://example.com/path ' + 'a'.repeat(75)
    const result = composeCliffhangerText(text, URL)
    expect(result.endsWith('... ' + URL)).toBe(true)
    // 結果全体のX文字数が280以内
    expect(countXChars(result)).toBeLessThanOrEqual(280)
  })

  test('URL が 23 文字固定でカウントされるため ASCII より多く入る', () => {
    // URL(24文字) vs URL(23X文字): 23文字固定なら1文字分余裕ができる
    // URL後の ASCII は maxXChars(253) - 23 = 230 文字分入れる
    const longUrl = 'https://example.com/path'  // 24文字だが X では 23 文字扱い
    const filler = 'a'.repeat(230)
    const text = longUrl + ' ' + filler  // 合計 255 グラフェムで 50 超
    const result = composeCliffhangerText(text, URL)
    expect(countXChars(result)).toBeLessThanOrEqual(280)
  })
})

describe('composeCliffhangerText — URL のアトミック処理', () => {
  // 'https://example.com' = 19 graphemes

  test('URL が halfPoint 前に収まる場合はそのまま含まれる', () => {
    // 'a'×30 + ' ' + URL(19) + ' ' + 'b'×30 = 81 graphemes, halfPoint=40
    // URL は gi=31 から始まり gi=50 で終わる（halfPoint を超えるが前から始まる）
    // → URL 丸ごと含めて次セグメントで打ち切り
    const text = 'a'.repeat(30) + ' https://example.com ' + 'b'.repeat(30)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(30) + ' https://example.com' + '... ' + URL)
  })

  test('URL が halfPoint をまたいでいても halfPoint 前に始まれば丸ごと含まれる', () => {
    // 'a'×25 + ' ' + URL(19) + ' ' + 'b'×25 = 71 graphemes, halfPoint=35
    // URL は gi=26 から始まり gi=45 で終わる（halfPoint=35 をまたぐ）
    // → URL を途中で切らず丸ごと含める
    const text = 'a'.repeat(25) + ' https://example.com ' + 'b'.repeat(25)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(25) + ' https://example.com' + '... ' + URL)
  })

  test('URL の開始が halfPoint 以降なら含まれない', () => {
    // 'a'×30 + ' ' + 'b'×30 + ' ' + URL(19) = 81 graphemes, halfPoint=40
    // URL は gi=62 から始まる（halfPoint=40 より後）
    // → テキストを halfPoint で打ち切り、URL は含まれない
    const text = 'a'.repeat(30) + ' ' + 'b'.repeat(30) + ' https://example.com'
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(30) + ' ' + 'b'.repeat(9) + '... ' + URL)
  })

  test('URL の開始がちょうど halfPoint のとき含まれない', () => {
    // 'a'×49 + ' ' + URL(19) + ' ' + 'b'×30 = 100 graphemes, halfPoint=50
    // ' ' までで cutAt=50 → その直後の URL は gi=50 >= halfPoint=50 で除外
    const text = 'a'.repeat(49) + ' https://example.com ' + 'b'.repeat(30)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe('a'.repeat(49) + ' ' + '... ' + URL)
  })

  test('先頭の長い URL が halfPoint をまたいでも URL 全体がテキスト部分になる', () => {
    // URL(40) + ' ' + 'b'×10 = 51 graphemes, halfPoint=25
    // URL は gi=0 から始まり gi=40 で終わる（halfPoint=25 をまたぐ）
    // → URL 丸ごと含めて次セグメントは halfPoint 超過のため打ち切り
    const longUrl = 'https://example.com/' + 'x'.repeat(20) // 40 graphemes
    const text = longUrl + ' ' + 'b'.repeat(10)
    const result = composeCliffhangerText(text, URL)
    expect(result).toBe(longUrl + '... ' + URL)
  })

  test('URL が途中で切れてテキストに現れないこと（旧バグの回帰テスト）', () => {
    // URL が halfPoint をまたぐとき、URL の一部だけが出力に含まれてはいけない
    const text = 'a'.repeat(25) + ' https://example.com/long-path ' + 'b'.repeat(25)
    const result = composeCliffhangerText(text, URL)
    const cliffhanger = result.slice(0, result.indexOf('... '))
    // テキスト部分に不完全な URL が含まれていないこと
    const hasPartialUrl = cliffhanger.includes('https://') && !cliffhanger.includes('https://example.com/long-path')
    expect(hasPartialUrl).toBe(false)
  })
})

describe('countXChars', () => {
  test('平文 ASCII はそのまま1文字1カウント', () => {
    expect(countXChars('hello')).toBe(5)
  })

  test('CJK文字は2カウント', () => {
    expect(countXChars('日本語')).toBe(6)
  })

  test('https URL は23文字固定', () => {
    expect(countXChars('https://www.yahoo.co.jp/')).toBe(23)
  })

  test('http URL も23文字固定', () => {
    expect(countXChars('http://example.com/very/long/path?q=1')).toBe(23)
  })

  test('テキスト中の URL は23文字に置き換えてカウント', () => {
    // 'hello ' (6) + URL (23) + ' world' (6) = 35
    expect(countXChars('hello https://example.com world')).toBe(35)
  })

  test('複数 URL はそれぞれ23文字', () => {
    // URL (23) + ' ' (1) + URL (23) = 47
    expect(countXChars('https://example.com https://www.yahoo.co.jp/')).toBe(47)
  })
})

describe('uint8ToBase64', () => {
  test('既知のバイト列を正しく base64 エンコードする', () => {
    expect(uint8ToBase64(new Uint8Array([1, 2, 3]))).toBe('AQID')
  })

  test('空の配列は空文字列になる', () => {
    expect(uint8ToBase64(new Uint8Array([]))).toBe('')
  })

  test('base64 → atob でラウンドトリップできる', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const decoded = Uint8Array.from(atob(uint8ToBase64(original)), c => c.charCodeAt(0))
    expect(decoded).toEqual(original)
  })
})
