import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createAccounts } from './createAccounts'

vi.mock('@atproto/api', () => ({ Agent: vi.fn() }))
vi.mock('../../lib/accounts', () => ({
  addStoredDid: vi.fn().mockResolvedValue(undefined),
  removeStoredDid: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../lib/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/client')>()
  return { ...actual, getOAuthClient: vi.fn().mockReturnValue({ revoke: vi.fn().mockResolvedValue(undefined) }) }
})
vi.mock('../../lib/session', () => ({
  checkOAuthCallback: vi.fn().mockResolvedValue(null),
  restoreSession: vi.fn().mockResolvedValue(null),
  restoreSessionByDid: vi.fn().mockResolvedValue(null),
}))

import { addStoredDid, removeStoredDid } from '../../lib/accounts'
import { getOAuthClient } from '../../lib/client'
import { checkOAuthCallback, restoreSession, restoreSessionByDid } from '../../lib/session'

const mockSession = (did: string) => ({ did }) as unknown as OAuthSession

function withAccounts<T>(fn: (accounts: ReturnType<typeof createAccounts>) => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    createRoot(async dispose => {
      try { resolve(await fn(createAccounts())) }
      catch (e) { reject(e) }
      finally { dispose() }
    })
  })
}

const defaultGetProfile = () =>
  Promise.resolve({ data: { handle: 'test.bsky.social', avatar: undefined } })

function makeAgentClass(getProfile: () => Promise<unknown> = defaultGetProfile) {
  return class { getProfile = vi.fn().mockImplementation(getProfile) } as unknown as typeof Agent
}

function mockAgentWith(getProfile: () => Promise<unknown>) {
  vi.mocked(Agent).mockImplementationOnce(makeAgentClass(getProfile))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(Agent).mockImplementation(makeAgentClass())
  vi.mocked(checkOAuthCallback).mockResolvedValue(null)
  vi.mocked(restoreSession).mockResolvedValue(null)
  vi.mocked(restoreSessionByDid).mockResolvedValue(null)
  vi.mocked(addStoredDid).mockResolvedValue(undefined)
  vi.mocked(removeStoredDid).mockResolvedValue(undefined)
  vi.mocked(getOAuthClient).mockReturnValue({ revoke: vi.fn().mockResolvedValue(undefined) } as unknown as ReturnType<typeof getOAuthClient>)
})

describe('createAccounts — initialize', () => {
  test('OAuth コールバックにセッションがあれば返してシグナルに設定する', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:callback')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      const result = await accounts.initialize([])
      expect(result).toBe(s)
      expect(accounts.session()).toBe(s)
      expect(addStoredDid).toHaveBeenCalledWith('did:plc:callback')
    })
  )

  test('保存済み DID からセッションを復元する', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:stored')
      vi.mocked(restoreSessionByDid).mockResolvedValue(s)
      const result = await accounts.initialize(['did:plc:stored'])
      expect(result).toBe(s)
      expect(accounts.session()).toBe(s)
    })
  )

  test('DID 復元が失敗したとき restoreSession にフォールバックする', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:fallback')
      vi.mocked(restoreSessionByDid).mockResolvedValue(null)
      vi.mocked(restoreSession).mockResolvedValue(s)
      const result = await accounts.initialize(['did:plc:stored'])
      expect(result).toBe(s)
      expect(accounts.session()).toBe(s)
      expect(addStoredDid).toHaveBeenCalledWith('did:plc:fallback')
    })
  )

  test('セッションが見つからなければ null を返してシグナルは null のまま', () =>
    withAccounts(async accounts => {
      const result = await accounts.initialize([])
      expect(result).toBeNull()
      expect(accounts.session()).toBeNull()
    })
  )
})

describe('createAccounts — loginWith', () => {
  test('セッションを設定して DID を保存する', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:new')
      await accounts.loginWith(s)
      expect(accounts.session()).toBe(s)
      expect(addStoredDid).toHaveBeenCalledWith('did:plc:new')
    })
  )
})

describe('createAccounts — switchTo', () => {
  test('DID に対応するセッションが見つかればアクティブになる', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:other')
      vi.mocked(restoreSessionByDid).mockResolvedValue(s)
      await accounts.switchTo('did:plc:other')
      expect(accounts.session()).toBe(s)
    })
  )

  test('セッションが見つからなければ何も変わらない', () =>
    withAccounts(async accounts => {
      vi.mocked(restoreSessionByDid).mockResolvedValue(null)
      await accounts.switchTo('did:plc:ghost')
      expect(accounts.session()).toBeNull()
    })
  )
})

describe('createAccounts — logout', () => {
  test('セッションがなければ何もしない', () =>
    withAccounts(async accounts => {
      await accounts.logout()
      expect(removeStoredDid).not.toHaveBeenCalled()
    })
  )

  test('他にアカウントがあれば次のアカウントに切り替わる', () =>
    withAccounts(async accounts => {
      const s1 = mockSession('did:plc:first')
      const s2 = mockSession('did:plc:second')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s1)
      await accounts.initialize(['did:plc:first', 'did:plc:second'])
      vi.mocked(restoreSessionByDid).mockResolvedValue(s2)
      await accounts.logout()
      expect(accounts.session()).toBe(s2)
      expect(removeStoredDid).toHaveBeenCalledWith('did:plc:first')
    })
  )

  test('残りアカウントの復元が失敗してもセッションがクリアされる', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:main')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize(['did:plc:main', 'did:plc:other'])
      vi.mocked(restoreSessionByDid).mockResolvedValue(null)
      await accounts.logout()
      expect(accounts.session()).toBeNull()
    })
  )

  test('他にアカウントがなければセッションが null になる', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:only')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize([])
      await accounts.logout()
      expect(accounts.session()).toBeNull()
      expect(removeStoredDid).toHaveBeenCalledWith('did:plc:only')
    })
  )

  test('revoke が失敗してもログアウトが完了する', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:only')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize([])
      vi.mocked(getOAuthClient).mockReturnValue({ revoke: vi.fn().mockRejectedValue(new Error('revoke failed')) } as unknown as ReturnType<typeof getOAuthClient>)
      await accounts.logout()
      expect(accounts.session()).toBeNull()
      expect(removeStoredDid).toHaveBeenCalledWith('did:plc:only')
    })
  )
})

describe('createAccounts — refreshProfiles', () => {
  test('currentUserInfo にプロフィール情報が設定される', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:test')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize([])
      await vi.waitFor(() => expect(accounts.currentUserInfo()).not.toBeNull())
      expect(accounts.currentUserInfo()).toEqual({ did: 'did:plc:test', handle: 'test.bsky.social', avatarUrl: undefined })
    })
  )

  test('getProfile 失敗時は did を handle として設定する', () =>
    withAccounts(async accounts => {
      mockAgentWith(() => Promise.reject(new Error('network error')))
      const s = mockSession('did:plc:test')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize([])
      await vi.waitFor(() => expect(accounts.currentUserInfo()).not.toBeNull())
      expect(accounts.currentUserInfo()).toEqual({ did: 'did:plc:test', handle: 'did:plc:test' })
    })
  )

  test('otherAccountInfos に他アカウントのプロフィールが設定される', () =>
    withAccounts(async accounts => {
      const s = mockSession('did:plc:main')
      vi.mocked(checkOAuthCallback).mockResolvedValue(s)
      await accounts.initialize(['did:plc:main', 'did:plc:other'])
      await vi.waitFor(() => expect(accounts.otherAccountInfos().length).toBeGreaterThan(0))
      expect(accounts.otherAccountInfos()[0]).toMatchObject({ did: 'did:plc:other', handle: 'test.bsky.social' })
    })
  )
})
