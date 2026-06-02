import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal } from 'solid-js'

import type { AccountInfo } from '../../lib/accounts'
import { addStoredDid, removeStoredDid } from '../../lib/accounts'
import { getOAuthClient } from '../../lib/client'
import { checkOAuthCallback, restoreSession, restoreSessionByDid } from '../../lib/session'

export function createAccounts() {
  const [session, setSession] = createSignal<OAuthSession | null>(null)
  const [storedDids, setStoredDids] = createSignal<string[]>([])
  const [currentUserInfo, setCurrentUserInfo] = createSignal<AccountInfo | null>(null)
  const [otherAccountInfos, setOtherAccountInfos] = createSignal<AccountInfo[]>([])

  async function refreshProfiles(s: OAuthSession, allDids: string[]) {
    const agent = new Agent(s)
    try {
      const res = await agent.getProfile({ actor: s.did })
      setCurrentUserInfo({ did: s.did, handle: res.data.handle, avatarUrl: res.data.avatar })
    } catch {
      setCurrentUserInfo({ did: s.did, handle: s.did })
    }
    const others = allDids.filter(d => d !== s.did)
    const results = await Promise.allSettled(
      others.map(async did => {
        const res = await agent.getProfile({ actor: did })
        return { did, handle: res.data.handle, avatarUrl: res.data.avatar } as AccountInfo
      })
    )
    setOtherAccountInfos(
      results.map((r, i) => r.status === 'fulfilled' ? r.value : { did: others[i], handle: others[i] })
    )
  }

  // 起動時のセッション復元。復元できたセッションを返す（null なら未ログイン）
  async function initialize(dids: string[]): Promise<OAuthSession | null> {
    setStoredDids(dids)
    const callbackSession = await checkOAuthCallback()
    if (callbackSession) {
      await addStoredDid(callbackSession.did)
      const newDids = [...new Set([...dids, callbackSession.did])]
      setStoredDids(newDids)
      setSession(callbackSession)
      await refreshProfiles(callbackSession, newDids)
      return callbackSession
    }
    let restored: OAuthSession | null = null
    if (dids.length > 0) restored = await restoreSessionByDid(dids[0])
    if (!restored) {
      restored = await restoreSession()
      if (restored) {
        await addStoredDid(restored.did)
        setStoredDids(prev => [...new Set([...prev, restored!.did])])
      }
    }
    if (restored) {
      setSession(restored)
      await refreshProfiles(restored, storedDids())
    }
    return restored
  }

  async function loginWith(s: OAuthSession) {
    await addStoredDid(s.did)
    const newDids = [...new Set([...storedDids(), s.did])]
    setStoredDids(newDids)
    setSession(s)
    await refreshProfiles(s, newDids)
  }

  async function switchTo(did: string) {
    const s = await restoreSessionByDid(did)
    if (s) {
      setCurrentUserInfo({ did, handle: did })
      setOtherAccountInfos([])
      setSession(s)
      void refreshProfiles(s, storedDids())
    }
  }

  // ログアウト後にセッションが残っていれば別アカウントに切り替え済み、null なら全アカウント削除済み
  async function logout(): Promise<void> {
    const did = session()?.did
    if (!did) return
    try { await getOAuthClient().revoke(did) } catch {
      try { await getOAuthClient().revoke(did) } catch {}
    }
    await removeStoredDid(did)
    const remaining = storedDids().filter(d => d !== did)
    setStoredDids(remaining)
    if (remaining.length > 0) {
      const s = await restoreSessionByDid(remaining[0])
      if (s) {
        setCurrentUserInfo({ did: remaining[0], handle: remaining[0] })
        setOtherAccountInfos([])
        setSession(s)
        void refreshProfiles(s, remaining)
        return
      }
    }
    setSession(null)
    setCurrentUserInfo(null)
    setOtherAccountInfos([])
  }

  return {
    session,
    currentUserInfo,
    otherAccountInfos,
    initialize,
    loginWith,
    switchTo,
    logout,
  }
}
