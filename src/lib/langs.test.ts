import { describe, expect, test } from 'vitest'

import { langLabel, langNativeLabel } from './langs'

describe('langLabel', () => {
  test('既知のコードはラベルを返す', () => {
    expect(langLabel('ja')).toBe('日本語 – Japanese')
    expect(langLabel('en')).toBe('English')
    expect(langLabel('zh-Hans-CN')).toBe('简体中文 – Simplified Chinese')
  })

  test('未知のコードはコード自体を返す', () => {
    expect(langLabel('xx')).toBe('xx')
    expect(langLabel('')).toBe('')
  })
})

describe('langNativeLabel', () => {
  test(' – で区切られている言語は先頭部分のみ返す', () => {
    expect(langNativeLabel('ja')).toBe('日本語')
    expect(langNativeLabel('zh-Hans-CN')).toBe('简体中文')
    expect(langNativeLabel('es')).toBe('español')
  })

  test(' – がない言語はラベルをそのまま返す', () => {
    expect(langNativeLabel('en')).toBe('English')
    expect(langNativeLabel('eo')).toBe('Esperanto')
    expect(langNativeLabel('ia')).toBe('Interlingua')
  })

  test('未知のコードはコード自体を返す', () => {
    expect(langNativeLabel('xx')).toBe('xx')
  })
})
