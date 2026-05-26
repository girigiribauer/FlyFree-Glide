import { describe, expect, test } from 'vitest'

import { uint8ToBase64 } from './xpost'

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
