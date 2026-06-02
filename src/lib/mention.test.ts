import { describe, expect, test } from 'vitest'

import { computeInsert, parseMention } from './mention'

describe('parseMention', () => {
  test('文頭の @ を検出する', () => {
    expect(parseMention('@alice', 6)).toEqual({ query: 'alice' })
  })

  test('スペース後の @ を検出する', () => {
    expect(parseMention('hello @ali', 10)).toEqual({ query: 'ali' })
  })

  test('改行後の @ を検出する', () => {
    expect(parseMention('hello\n@ali', 10)).toEqual({ query: 'ali' })
  })

  test('@直後のクエリが空でも検出する', () => {
    expect(parseMention('hello @', 7)).toEqual({ query: '' })
  })

  test('@の後にスペースが入ると null', () => {
    expect(parseMention('@alice world', 12)).toBeNull()
  })

  test('@がなければ null', () => {
    expect(parseMention('hello world', 11)).toBeNull()
  })

  test('カーソルが @ の手前なら null', () => {
    expect(parseMention('@alice', 0)).toBeNull()
  })
})

describe('computeInsert', () => {
  test('文頭の @query をハンドルに置換する', () => {
    expect(computeInsert('@alice', 6, 'alice.bsky.social')).toEqual({
      newText: '@alice.bsky.social ',
      newCursor: 19,
    })
  })

  test('途中の @query をハンドルに置換する', () => {
    expect(computeInsert('hello @ali', 10, 'alice.bsky.social')).toEqual({
      newText: 'hello @alice.bsky.social ',
      newCursor: 25,
    })
  })

  test('カーソル以降のテキストを保持する', () => {
    const result = computeInsert('hello @ali', 10, 'alice.bsky.social')
    expect(result?.newText).toBe('hello @alice.bsky.social ')
  })

  test('@パターンがなければ null を返す', () => {
    expect(computeInsert('hello world', 5, 'alice.bsky.social')).toBeNull()
  })
})
