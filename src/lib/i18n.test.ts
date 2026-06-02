import { afterEach, describe, expect, test, vi } from 'vitest'

import { getLang, resetLang, setLang, t } from './i18n'

afterEach(() => {
  resetLang()
})

describe('getLang — navigator 検出', () => {
  test('navigator.language が ja のとき ja を返す', () => {
    vi.stubGlobal('navigator', { language: 'ja' })
    expect(getLang()).toBe('ja')
  })

  test('navigator.language が ja-JP のとき ja を返す', () => {
    vi.stubGlobal('navigator', { language: 'ja-JP' })
    expect(getLang()).toBe('ja')
  })

  test('navigator.language が en-US のとき en を返す', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(getLang()).toBe('en')
  })

  test('navigator.language が空のとき en を返す', () => {
    vi.stubGlobal('navigator', { language: '' })
    expect(getLang()).toBe('en')
  })
})

describe('setLang — 強制モード', () => {
  test('setLang("en") は navigator.language が ja でも en を返す', () => {
    vi.stubGlobal('navigator', { language: 'ja' })
    setLang('en')
    expect(getLang()).toBe('en')
  })

  test('setLang("ja") は navigator.language が en でも ja を返す', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    setLang('ja')
    expect(getLang()).toBe('ja')
  })

  test('resetLang() に戻すと navigator.language に従う', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    setLang('ja')
    resetLang()
    expect(getLang()).toBe('en')
  })
})

describe('t — 翻訳', () => {
  test('ja のとき日本語文字列を返す', () => {
    setLang('ja')
    expect(t('loginTitle')).toBe('ログイン')
  })

  test('en のとき英語文字列を返す', () => {
    setLang('en')
    expect(t('loginTitle')).toBe('Login')
  })

  test('ja の変数補間', () => {
    setLang('ja')
    expect(t('autoCloseCountdown', { count: 5 })).toBe('5秒後にこのウィンドウを自動で閉じます')
  })

  test('en の変数補間', () => {
    setLang('en')
    expect(t('autoCloseCountdown', { count: 5 })).toBe('This window will close in 5 seconds')
  })
})
