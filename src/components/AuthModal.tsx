import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onCleanup, Show } from 'solid-js'

import { OAuthCancelledError, startOAuthFlow } from '../lib/auth'
import styles from './AuthModal.module.css'

interface Props {
  closeable: boolean
  onSuccess: (session: OAuthSession) => void
  onClose: () => void
}

export default function AuthModal(props: Props) {
  const [handle, setHandle] = createSignal('')
  const [pds, setPds] = createSignal('bsky.social')
  const [showPds, setShowPds] = createSignal(false)
  const [authorizing, setAuthorizing] = createSignal(false)
  const [error, setError] = createSignal('')
  let cancelAuth: (() => void) | undefined

  onCleanup(() => cancelAuth?.())

  async function login() {
    if (!handle().trim() || !pds().trim()) return
    setError('')
    setAuthorizing(true)
    const { promise, cancel } = startOAuthFlow(handle().trim(), pds().trim())
    cancelAuth = cancel
    try {
      const session = await promise
      props.onSuccess(session)
    } catch (err: unknown) {
      if (!(err instanceof OAuthCancelledError)) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setAuthorizing(false)
      cancelAuth = undefined
    }
  }

  return (
    <div class={styles.page}>
      <Show when={props.closeable}>
        <button class={styles.closeButton} onClick={props.onClose}>×</button>
      </Show>
      <div class={styles.contents}>
        <h1 class={styles.title}>ログイン</h1>
        <div class={styles.account}>
          <div class={styles.labelRow}>
            <span class={styles.labelText}>Bluesky アカウント名</span>
            <button class={styles.toggleButton} onClick={() => setShowPds(v => !v)} aria-label="PDS設定を開く">
              {showPds() ? '▲' : '▼'}
            </button>
          </div>
          <input
            class={styles.input}
            type="text"
            placeholder="example.bsky.social"
            value={handle()}
            onInput={e => setHandle(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
        </div>
        <div class={showPds() ? styles.pdsSection : styles.pdsSectionHidden}>
          <div class={styles.labelRow}>
            <span class={styles.labelText}>PDS の変更</span>
          </div>
          <input
            class={styles.input}
            type="text"
            placeholder="bsky.social"
            value={pds()}
            onInput={e => setPds(e.currentTarget.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
        </div>
        <div class={styles.separator} />
        <div class={styles.submit}>
          <p class={styles.submitText}>Bluesky の認証画面が開きます。</p>
          <button
            class={styles.loginButton}
            onClick={login}
            disabled={!handle().trim() || !pds().trim() || authorizing()}
          >
            {authorizing() ? '認証中...' : 'Bluesky でログイン'}
          </button>
        </div>
        <Show when={authorizing()}>
          <p class={styles.authMessage}>Bluesky の認証画面で操作してください</p>
        </Show>
        <Show when={error()}>
          <p class={styles.error}>{error()}</p>
        </Show>
      </div>
    </div>
  )
}
