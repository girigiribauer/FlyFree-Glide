import type { OAuthSession } from '@atproto/oauth-client-browser'

import { getOAuthClient, OAUTH_CALLBACK_URL } from './client'
import { extractCallbackParams } from './oauth'

const CALLBACK_URL_PATTERN = `${OAUTH_CALLBACK_URL}*`

export async function checkOAuthCallback(): Promise<OAuthSession | null> {
  const tabs = await browser.tabs.query({ url: CALLBACK_URL_PATTERN })
  for (const tab of tabs) {
    if (!tab.url) continue
    const url = new URL(tab.url)
    const p = extractCallbackParams(url)
    if (!p) continue
    const client = getOAuthClient()
    const { session } = await client.initCallback(p, OAUTH_CALLBACK_URL)
    const callbackTabs = await browser.tabs.query({ url: CALLBACK_URL_PATTERN })
    await Promise.all(callbackTabs.filter(t => t.id != null).map(t => browser.tabs.remove(t.id!)))
    return session
  }
  return null
}

export async function restoreSession(): Promise<OAuthSession | null> {
  try {
    const result = await getOAuthClient().initRestore()
    return result?.session ?? null
  } catch {
    return null
  }
}
