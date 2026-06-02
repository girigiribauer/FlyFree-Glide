import type { OAuthSession } from '@atproto/oauth-client-browser'

import { getOAuthClient } from './client'
import { checkOAuthCallback } from './session'

export class OAuthCancelledError extends Error {
  constructor() {
    super('cancelled')
  }
}

export function startOAuthFlow(handle: string, pds: string): {
  promise: Promise<OAuthSession>
  cancel: () => void
} {
  let cancelled = false
  let intervalId: ReturnType<typeof setInterval> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let windowRemovedListener: ((windowId: number) => void) | undefined
  let rejectFn: ((err: unknown) => void) | undefined

  function cleanup() {
    clearInterval(intervalId)
    clearTimeout(timeoutId)
    if (windowRemovedListener) {
      browser.windows.onRemoved.removeListener(windowRemovedListener)
      windowRemovedListener = undefined
    }
    intervalId = undefined
    timeoutId = undefined
  }

  function cancel() {
    if (cancelled) return
    cancelled = true
    cleanup()
    rejectFn?.(new OAuthCancelledError())
  }

  const promise = new Promise<OAuthSession>((resolve, reject) => {
    rejectFn = reject

    async function run() {
      try {
        const win = await browser.windows.getCurrent()
        if (cancelled) return

        const popupWindowId = win.id
        const host = pds.includes('://') ? pds : `https://${pds}`
        const client = getOAuthClient(host)
        const authUrl = await client.authorize(handle)
        if (cancelled) return

        const authWin = await browser.windows.create({ url: authUrl.toString(), type: 'normal', width: 600, height: 640 })
        if (cancelled) return

        if (authWin?.id != null) {
          windowRemovedListener = (closedWindowId: number) => {
            if (closedWindowId === authWin!.id) cancel()
          }
          browser.windows.onRemoved.addListener(windowRemovedListener)
        }

        intervalId = setInterval(async () => {
          try {
            const session = await checkOAuthCallback()
            if (session) {
              cleanup()
              if (popupWindowId != null) browser.windows.update(popupWindowId, { focused: true })
              resolve(session)
            }
          } catch (err) {
            cleanup()
            reject(err)
          }
        }, 500)

        timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('認証がタイムアウトしました。もう一度お試しください。'))
        }, 5 * 60 * 1000)

      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    void run()
  })

  return { promise, cancel }
}
