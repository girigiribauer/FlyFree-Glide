import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onMount, Show } from 'solid-js'

import { composeInitialText } from '../../lib/initialText'
import { checkOAuthCallback, restoreSession } from '../../lib/session'
import { openXCompose } from '../../lib/xpost'
import AuthModal from './AuthModal'
import CompleteModal from './CompleteModal'
import ComposeScreen from './ComposeScreen'

type ModalState =
  | { kind: 'none' }
  | { kind: 'auth'; closeable: boolean }
  | { kind: 'complete'; url: string }

export default function App() {
  const [session, setSession] = createSignal<OAuthSession | null>(null)
  const [modal, setModal] = createSignal<ModalState>({ kind: 'none' })
  const [loading, setLoading] = createSignal(true)
  const [initialText, setInitialText] = createSignal('')

  onMount(async () => {
    const stored = await browser.storage.session.get('pendingPage')
    const page = stored.pendingPage as { url?: string; title?: string } | undefined
    if (page) {
      setInitialText(composeInitialText(page))
      await browser.storage.session.remove('pendingPage')
    }

    try {
      const callbackSession = await checkOAuthCallback()
      if (callbackSession) {
        setSession(callbackSession)
      } else {
        const saved = await restoreSession()
        if (saved) {
          setSession(saved)
        } else {
          setModal({ kind: 'auth', closeable: false })
        }
      }
    } finally {
      setLoading(false)
    }
  })

  const authModal = () => {
    const m = modal()
    return m.kind === 'auth' ? m : undefined
  }

  const completeModal = () => {
    const m = modal()
    return m.kind === 'complete' ? m : undefined
  }

  return (
    <Show when={!loading()} fallback={<p>Loading...</p>}>
      <Show when={session()}>
        {s => (
          <ComposeScreen
            session={s()}
            initialText={initialText()}
            onPost={url => {
              setModal({ kind: 'complete', url })
              openXCompose()
            }}
            onLogout={() => { setSession(null); setModal({ kind: 'auth', closeable: false }) }}
          />
        )}
      </Show>
      <Show when={authModal()}>
        {m => (
          <AuthModal
            closeable={m().closeable}
            onSuccess={s => { setSession(s); setModal({ kind: 'none' }) }}
            onClose={() => setModal({ kind: 'none' })}
          />
        )}
      </Show>
      <Show when={completeModal()}>
        {m => <CompleteModal url={m().url} onClose={() => window.close()} />}
      </Show>
    </Show>
  )
}
