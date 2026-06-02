import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onCleanup, Show } from 'solid-js'

import { OAuthCancelledError, startOAuthFlow } from '../lib/auth'
import { t } from '../lib/i18n'
import styles from './AuthModal.module.css'
import { CloseIcon } from './Icons'

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
        <button class={styles.closeButton} aria-label={t('close')} onClick={props.onClose}><CloseIcon size={14} /></button>
      </Show>
      <div class={styles.contents}>
        <h1 class={styles.title}>{t('loginTitle')}</h1>
        <div class={styles.account}>
          <div class={styles.labelRow}>
            <span class={styles.labelText}>{t('bskyAccountName')}</span>
            <button class={styles.toggleButton} onClick={() => setShowPds(v => !v)} aria-label={t('pdsToggleAriaLabel')}>
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
            <span class={styles.labelText}>{t('pdsChange')}</span>
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
          <p class={styles.submitText}>{t('bskyAuthWillOpen')}</p>
          <button
            class={styles.loginButton}
            onClick={login}
            disabled={!handle().trim() || !pds().trim() || authorizing()}
          >
            {authorizing() ? t('authorizing') : t('bskyLogin')}
          </button>
        </div>
        <Show when={authorizing()}>
          <p class={styles.authMessage}>{t('bskyAuthInProgress')}</p>
        </Show>
        <Show when={error()}>
          <p class={styles.error}>{error()}</p>
        </Show>
      </div>
    </div>
  )
}
