import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onMount, Show } from 'solid-js'

import AuthModal from '../../components/AuthModal'
import CompleteScreen from '../../components/CompleteScreen'
import ComposeScreen from '../../components/ComposeScreen'
import LoadingScreen from '../../components/LoadingScreen'
import { getStoredDids } from '../../lib/accounts'
import { setLang } from '../../lib/i18n'
import { composeInitialText } from '../../lib/initialText'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../../lib/settings'
import type { XDraft } from '../../lib/xpost'
import { createAccounts } from './createAccounts'

type ModalState =
  | { kind: 'none' }
  | { kind: 'auth'; closeable: boolean }
  | { kind: 'complete'; url: string; countdown: boolean }

export default function App() {
  const accounts = createAccounts()
  const [modal, setModal] = createSignal<ModalState>({ kind: 'none' })
  const [loading, setLoading] = createSignal(true)
  const [initialText, setInitialText] = createSignal('')
  const [settings, setSettings] = createSignal<Settings>(DEFAULT_SETTINGS)
  const [pendingXDraft, setPendingXDraft] = createSignal<XDraft | null>(null)

  onMount(async () => {
    const [stored, dids] = await Promise.all([
      browser.storage.session.get('pendingPage'),
      getStoredDids(),
      loadSettings().then(s => { setLang(s.uiLang); setSettings(s) }),
    ])
    const page = stored.pendingPage as { url?: string; title?: string } | undefined
    if (page && !settings().startBlank) setInitialText(composeInitialText(page))
    if (page) await browser.storage.session.remove('pendingPage')

    try {
      const s = await accounts.initialize(dids)
      if (!s) setModal({ kind: 'auth', closeable: false })
    } finally {
      setLoading(false)
    }
  })

  async function handleAuthSuccess(s: OAuthSession) {
    await accounts.loginWith(s)
    setModal({ kind: 'none' })
  }

  async function handleLogout() {
    await accounts.logout()
    if (!accounts.session()) setModal({ kind: 'auth', closeable: false })
  }

  function handlePost(url: string, xDraft: XDraft) {
    setPendingXDraft(xDraft)
    if (!settings().xHidden && settings().xAutoOpen) {
      void browser.runtime.sendMessage({ type: 'openXCompose', xDraft, imageUrls: [] })
    }
    if (settings().autoClose === 'immediate') {
      window.close()
    } else {
      setModal({ kind: 'complete', url, countdown: settings().autoClose === 'countdown' })
    }
  }

  function handleOpenSettings() {
    void browser.runtime.openOptionsPage()
  }

  function handleOpenX() {
    const draft = pendingXDraft()
    if (draft) void browser.runtime.sendMessage({ type: 'openXCompose', xDraft: draft, imageUrls: [] })
  }

  const authModal = () => { const m = modal(); return m.kind === 'auth' ? m : undefined }
  const completeScreen = () => { const m = modal(); return m.kind === 'complete' ? m : undefined }

  return (
    <Show when={!loading()} fallback={<LoadingScreen />}>
      <Show when={completeScreen()}>
        {m => (
          <CompleteScreen
            url={m().url}
            countdown={m().countdown}
            xEnabled={!settings().xHidden}
            onOpenX={handleOpenX}
            onClose={() => window.close()}
          />
        )}
      </Show>
      <Show when={!completeScreen()}>
        <Show when={accounts.session() && accounts.currentUserInfo() && !authModal()}>
          <ComposeScreen
            session={accounts.session()!}
            currentUser={accounts.currentUserInfo()!}
            initialText={initialText()}
            accounts={accounts.otherAccountInfos()}
            settings={settings()}
            onSettingsChange={patch => { setSettings(s => ({ ...s, ...patch })); void saveSettings(patch) }}
            onOpenSettings={handleOpenSettings}
            onPost={handlePost}
            onSwitchAccount={accounts.switchTo}
            onAddAccount={() => setModal({ kind: 'auth', closeable: true })}
            onLogout={handleLogout}
          />
        </Show>
        <Show when={authModal()}>
          {m => (
            <AuthModal
              closeable={m().closeable}
              onSuccess={handleAuthSuccess}
              onClose={() => setModal({ kind: 'none' })}
            />
          )}
        </Show>
      </Show>
    </Show>
  )
}
