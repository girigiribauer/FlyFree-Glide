import type { OAuthSession } from '@atproto/oauth-client-browser'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { checkOAuthCallback, restoreSession, restoreSessionByDid } from './session'

vi.mock('./client', () => ({
  OAUTH_CALLBACK_URL: 'https://example.com/oauth/callback',
  getOAuthClient: vi.fn().mockReturnValue({
    initCallback: vi.fn().mockResolvedValue({ session: null }),
    initRestore: vi.fn().mockResolvedValue(null),
    restore: vi.fn().mockResolvedValue(null),
  }),
}))
vi.mock('./oauth', () => ({
  extractCallbackParams: vi.fn().mockReturnValue(null),
}))

import { getOAuthClient } from './client'
import { extractCallbackParams } from './oauth'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession
const CALLBACK_URL = 'https://example.com/oauth/callback'

beforeEach(() => vi.clearAllMocks())

describe('checkOAuthCallback', () => {
  test('コールバック URL のタブがなければ null を返す', async () => {
    ;(browser.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([])
    expect(await checkOAuthCallback()).toBeNull()
  })

  test('タブに URL がなければスキップして null を返す', async () => {
    ;(browser.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }])
    expect(await checkOAuthCallback()).toBeNull()
  })

  test('URL にコールバックパラメータがなければスキップして null を返す', async () => {
    ;(browser.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, url: `${CALLBACK_URL}#no_params` },
    ])
    vi.mocked(extractCallbackParams).mockReturnValue(null)
    expect(await checkOAuthCallback()).toBeNull()
  })

  test('有効なコールバックがあれば session を返してタブを閉じる', async () => {
    const params = new URLSearchParams('code=abc&state=xyz')
    ;(browser.tabs.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 1, url: `${CALLBACK_URL}#code=abc&state=xyz` }])
      .mockResolvedValueOnce([{ id: 1 }])
    vi.mocked(extractCallbackParams).mockReturnValue(params)
    vi.mocked(getOAuthClient).mockReturnValue({
      initCallback: vi.fn().mockResolvedValue({ session: mockSession }),
      initRestore: vi.fn(),
      restore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)

    expect(await checkOAuthCallback()).toBe(mockSession)
    expect(browser.tabs.remove).toHaveBeenCalledWith(1)
  })
})

describe('restoreSession', () => {
  test('initRestore が session を返せばそれを返す', async () => {
    vi.mocked(getOAuthClient).mockReturnValue({
      initRestore: vi.fn().mockResolvedValue({ session: mockSession }),
      initCallback: vi.fn(),
      restore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)
    expect(await restoreSession()).toBe(mockSession)
  })

  test('initRestore が null を返せば null を返す', async () => {
    vi.mocked(getOAuthClient).mockReturnValue({
      initRestore: vi.fn().mockResolvedValue(null),
      initCallback: vi.fn(),
      restore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)
    expect(await restoreSession()).toBeNull()
  })

  test('initRestore が失敗しても null を返す', async () => {
    vi.mocked(getOAuthClient).mockReturnValue({
      initRestore: vi.fn().mockRejectedValue(new Error('network error')),
      initCallback: vi.fn(),
      restore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)
    expect(await restoreSession()).toBeNull()
  })
})

describe('restoreSessionByDid', () => {
  test('restore が session を返せばそれを返す', async () => {
    vi.mocked(getOAuthClient).mockReturnValue({
      restore: vi.fn().mockResolvedValue(mockSession),
      initCallback: vi.fn(),
      initRestore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)
    expect(await restoreSessionByDid('did:plc:test')).toBe(mockSession)
  })

  test('restore が失敗しても null を返す', async () => {
    vi.mocked(getOAuthClient).mockReturnValue({
      restore: vi.fn().mockRejectedValue(new Error('session expired')),
      initCallback: vi.fn(),
      initRestore: vi.fn(),
    } as unknown as ReturnType<typeof getOAuthClient>)
    expect(await restoreSessionByDid('did:plc:test')).toBeNull()
  })
})
