import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onCleanup, Show } from 'solid-js'

import { getOAuthClient } from '../../lib/client'
import { checkOAuthCallback } from '../../lib/session'

interface Props {
  closeable: boolean
  onSuccess: (session: OAuthSession) => void
  onClose: () => void
}

export default function AuthModal(props: Props) {
  const [handle, setHandle] = createSignal('')
  const [pds, setPds] = createSignal('bsky.social')
  const [authorizing, setAuthorizing] = createSignal(false)
  const [error, setError] = createSignal('')
  let intervalId: ReturnType<typeof setInterval> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => {
    clearInterval(intervalId)
    clearTimeout(timeoutId)
  })

  async function login() {
    if (!handle().trim() || !pds().trim()) return
    setError('')
    try {
      const win = await browser.windows.getCurrent()
      const popupWindowId = win.id
      const host = pds().trim()
      const resolverUrl = host.includes('://') ? host : `https://${host}`
      const client = getOAuthClient(resolverUrl)
      const authUrl = await client.authorize(handle().trim())
      browser.windows.create({ url: authUrl.toString(), type: 'normal', width: 500, height: 700 })
      startPolling(popupWindowId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function stopPolling() {
    clearInterval(intervalId)
    clearTimeout(timeoutId)
    intervalId = undefined
    timeoutId = undefined
    setAuthorizing(false)
  }

  function startPolling(popupWindowId: number | undefined) {
    setAuthorizing(true)
    intervalId = setInterval(async () => {
      try {
        const session = await checkOAuthCallback()
        if (session) {
          stopPolling()
          if (popupWindowId != null) browser.windows.update(popupWindowId, { focused: true })
          props.onSuccess(session)
        }
      } catch (err) {
        stopPolling()
        setError(err instanceof Error ? err.message : String(err))
      }
    }, 500)
    timeoutId = setTimeout(() => {
      stopPolling()
      setError('認証がタイムアウトしました。もう一度お試しください。')
    }, 5 * 60 * 1000)
  }

  return (
    <div style={{ position: 'fixed', inset: '0', background: 'white', padding: '16px' }}>
      <Show when={props.closeable}>
        <button onClick={props.onClose} style={{ float: 'right' }}>×</button>
      </Show>
      <p>FlyFree Glide</p>
      <input
        type="text"
        placeholder="Bluesky handle (e.g. user.bsky.social)"
        value={handle()}
        onInput={e => setHandle(e.currentTarget.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
      />
      <details>
        <summary>PDS を変更する</summary>
        <input
          type="text"
          placeholder="bsky.social"
          value={pds()}
          onInput={e => setPds(e.currentTarget.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
      </details>
      <button onClick={login} disabled={!handle().trim() || !pds().trim() || authorizing()}>
        {authorizing() ? '認証中...' : 'Login with Bluesky'}
      </button>
      <Show when={authorizing()}>
        <p>Bluesky の認証画面で操作してください</p>
      </Show>
      <Show when={error()}>
        <p style={{ color: 'red' }}>{error()}</p>
      </Show>
    </div>
  )
}
