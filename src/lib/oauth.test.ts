import { describe, expect, test } from 'vitest'

import { extractCallbackParams } from './oauth'

const BASE = 'https://girigiribauer.github.io/FlyFree-Glide/oauth/callback'

describe('extractCallbackParams', () => {
  // AT Protocol は response_mode=fragment を使うため hash にパラメータが入る
  test('AT Protocol: hash に code と state がある場合に返す', () => {
    const url = new URL(`${BASE}#code=mycode&state=mystate&iss=https%3A%2F%2Fbsky.social`)
    const p = extractCallbackParams(url)
    expect(p?.get('code')).toBe('mycode')
    expect(p?.get('state')).toBe('mystate')
  })

  test('フォールバック: query string に code と state がある場合も返す', () => {
    const url = new URL(`${BASE}?code=mycode&state=mystate`)
    const p = extractCallbackParams(url)
    expect(p?.get('code')).toBe('mycode')
    expect(p?.get('state')).toBe('mystate')
  })

  test('hash に code がない場合は null', () => {
    const url = new URL(`${BASE}#state=mystate&iss=https%3A%2F%2Fbsky.social`)
    expect(extractCallbackParams(url)).toBeNull()
  })

  test('hash に state がない場合は null', () => {
    const url = new URL(`${BASE}#code=mycode`)
    expect(extractCallbackParams(url)).toBeNull()
  })

  test('hash も query string もパラメータがない場合は null', () => {
    const url = new URL(BASE)
    expect(extractCallbackParams(url)).toBeNull()
  })

  test('エラーレスポンス（code なし、error あり）は null', () => {
    const url = new URL(`${BASE}#error=access_denied&state=mystate`)
    expect(extractCallbackParams(url)).toBeNull()
  })
})
