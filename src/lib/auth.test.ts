import type { OAuthSession } from '@atproto/oauth-client-browser'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { OAuthCancelledError, startOAuthFlow } from './auth'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return {
    ...actual,
    getOAuthClient: vi.fn().mockReturnValue({
      authorize: vi.fn().mockResolvedValue(new URL('https://auth.bsky.social')),
    }),
  }
})
vi.mock('./session', () => ({
  checkOAuthCallback: vi.fn().mockResolvedValue(null),
}))

import { getOAuthClient } from './client'
import { checkOAuthCallback } from './session'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

describe('startOAuthFlow — URL 構築', () => {
  beforeEach(() => vi.clearAllMocks())

  test('PDS に https:// がない場合は補完する', async () => {
    startOAuthFlow('user.bsky.social', 'bsky.social')
    await vi.waitFor(() => expect(vi.mocked(getOAuthClient)).toHaveBeenCalledWith('https://bsky.social'))
  })

  test('カスタム PDS も https:// を補完する', async () => {
    startOAuthFlow('user.custom.pds', 'pds.example.com')
    await vi.waitFor(() => expect(vi.mocked(getOAuthClient)).toHaveBeenCalledWith('https://pds.example.com'))
  })

  test('https:// 付きで入力した場合はそのまま渡される', async () => {
    startOAuthFlow('user.custom.pds', 'https://pds.example.com')
    await vi.waitFor(() => expect(vi.mocked(getOAuthClient)).toHaveBeenCalledWith('https://pds.example.com'))
  })
})

describe('startOAuthFlow — ポーリング', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  test('ポーリングで session が見つかったら promise が resolve する', async () => {
    vi.mocked(checkOAuthCallback)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockSession)
    const { promise } = startOAuthFlow('user.bsky.social', 'bsky.social')
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)
    await expect(promise).resolves.toBe(mockSession)
  })

  test('ポーリングエラー時に promise が reject する', async () => {
    vi.mocked(checkOAuthCallback).mockRejectedValueOnce(new Error('callback failed'))
    const { promise } = startOAuthFlow('user.bsky.social', 'bsky.social')
    const rejectCheck = expect(promise).rejects.toThrow('callback failed')
    await vi.advanceTimersByTimeAsync(500)
    await rejectCheck
  })

  test('5分後にタイムアウトエラーで reject する', async () => {
    const { promise } = startOAuthFlow('user.bsky.social', 'bsky.social')
    const rejectCheck = expect(promise).rejects.toThrow('認証がタイムアウトしました')
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    await rejectCheck
  })
})

describe('startOAuthFlow — キャンセル', () => {
  beforeEach(() => vi.clearAllMocks())

  test('cancel() を呼ぶと OAuthCancelledError で reject する', async () => {
    const { promise, cancel } = startOAuthFlow('user.bsky.social', 'bsky.social')
    cancel()
    await expect(promise).rejects.toBeInstanceOf(OAuthCancelledError)
  })

  test('認証ウィンドウが閉じられたら OAuthCancelledError で reject する', async () => {
    ;(browser.windows.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 42 })
    const { promise } = startOAuthFlow('user.bsky.social', 'bsky.social')
    await vi.waitFor(() =>
      expect(browser.windows.onRemoved.addListener).toHaveBeenCalled()
    )
    const listener = vi.mocked(browser.windows.onRemoved.addListener).mock.calls[0][0] as (id: number) => void
    listener(42)
    await expect(promise).rejects.toBeInstanceOf(OAuthCancelledError)
  })
})
