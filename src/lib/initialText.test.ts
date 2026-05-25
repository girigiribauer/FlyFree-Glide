import { describe, expect, test } from 'vitest'
import { composeInitialText } from './initialText'

describe('composeInitialText', () => {
  test('title と url があればスペース区切りで返す', () => {
    expect(composeInitialText({ title: 'Example Page', url: 'https://example.com' }))
      .toBe('Example Page https://example.com')
  })

  test('url のみのとき url だけ返す', () => {
    expect(composeInitialText({ url: 'https://example.com' }))
      .toBe('https://example.com')
  })

  test('title のみのとき title だけ返す', () => {
    expect(composeInitialText({ title: 'Example Page' }))
      .toBe('Example Page')
  })

  test('どちらもなければ空文字を返す', () => {
    expect(composeInitialText({})).toBe('')
  })

  test('title が空白のみのとき url だけ返す', () => {
    expect(composeInitialText({ title: '   ', url: 'https://example.com' }))
      .toBe('https://example.com')
  })

  test('title が空文字のとき url だけ返す', () => {
    expect(composeInitialText({ title: '', url: 'https://example.com' }))
      .toBe('https://example.com')
  })

  test('title を trim してから結合する', () => {
    expect(composeInitialText({ title: '  Example Page  ', url: 'https://example.com' }))
      .toBe('Example Page https://example.com')
  })

  test('url が空文字のとき title だけ返す', () => {
    expect(composeInitialText({ title: 'Example Page', url: '' }))
      .toBe('Example Page')
  })

  test('日本語 title と url', () => {
    expect(composeInitialText({ title: 'Yahoo! JAPAN', url: 'https://www.yahoo.co.jp/' }))
      .toBe('Yahoo! JAPAN https://www.yahoo.co.jp/')
  })

  test('title に URL が含まれていても url を重複して付ける', () => {
    expect(composeInitialText({ title: 'https://example.com の記事', url: 'https://example.com' }))
      .toBe('https://example.com の記事 https://example.com')
  })
})
