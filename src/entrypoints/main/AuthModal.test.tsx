import { render, screen, fireEvent } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AuthModal from './AuthModal'
import type { OAuthSession } from '@atproto/oauth-client-browser'

vi.mock('../../lib/client', () => ({
  getOAuthClient: vi.fn().mockReturnValue({
    authorize: vi.fn().mockResolvedValue(new URL('https://auth.bsky.social')),
  }),
}))
vi.mock('../../lib/session', () => ({
  checkOAuthCallback: vi.fn().mockResolvedValue(null),
}))

import { getOAuthClient } from '../../lib/client'
import { checkOAuthCallback } from '../../lib/session'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession
const HANDLE_INPUT_PLACEHOLDER = 'Bluesky handle (e.g. user.bsky.social)'

function renderModal(closeable = false, onSuccess = vi.fn(), onClose = vi.fn()) {
  return render(() => <AuthModal closeable={closeable} onSuccess={onSuccess} onClose={onClose} />)
}

function inputHandle(value: string) {
  fireEvent.input(screen.getByPlaceholderText(HANDLE_INPUT_PLACEHOLDER), {
    target: { value },
  })
}

describe('AuthModal — ログインボタンの活性制御', () => {
  test('handle が空のとき無効', () => {
    renderModal()
    expect(screen.getByText('Login with Bluesky')).toBeDisabled()
  })

  test('handle 入力後に有効になる', () => {
    renderModal()
    inputHandle('user.bsky.social')
    expect(screen.getByText('Login with Bluesky')).toBeEnabled()
  })

  test('空白のみは無効', () => {
    renderModal()
    inputHandle('   ')
    expect(screen.getByText('Login with Bluesky')).toBeDisabled()
  })
})

describe('AuthModal — 表示制御', () => {
  test('closeable=true のとき × ボタンが表示される', () => {
    renderModal(true)
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  test('closeable=false のとき × ボタンが表示されない', () => {
    renderModal(false)
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })
})

describe('AuthModal — 認証フロー', () => {
  beforeEach(() => vi.clearAllMocks())

  test('ログイン実行で認証中状態になる', async () => {
    renderModal()
    inputHandle('user.bsky.social')
    fireEvent.click(screen.getByText('Login with Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('認証中...')).toBeInTheDocument())
    expect(screen.getByText('Bluesky の認証画面で操作してください')).toBeInTheDocument()
    expect(screen.getByText('認証中...')).toBeDisabled()
  })

  test('authorize エラー時にエラーメッセージが表示される', async () => {
    vi.mocked(getOAuthClient).mockReturnValueOnce({
      authorize: vi.fn().mockRejectedValueOnce(new Error('invalid handle')),
    } as unknown as ReturnType<typeof getOAuthClient>)
    renderModal()
    inputHandle('invalid@@handle')
    fireEvent.click(screen.getByText('Login with Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('invalid handle')).toBeInTheDocument())
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
  })
})

describe('AuthModal — ポーリング', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  async function startAuth(onSuccess = vi.fn()) {
    renderModal(false, onSuccess)
    inputHandle('user.bsky.social')
    fireEvent.click(screen.getByText('Login with Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('認証中...')).toBeInTheDocument())
  }

  test('ポーリングで session が見つかったら onSuccess が呼ばれる', async () => {
    const onSuccess = vi.fn()
    vi.mocked(checkOAuthCallback).mockResolvedValueOnce(null).mockResolvedValueOnce(mockSession)
    await startAuth(onSuccess)
    await vi.advanceTimersByTimeAsync(500) // 1回目: null
    await vi.advanceTimersByTimeAsync(500) // 2回目: session
    expect(onSuccess).toHaveBeenCalledWith(mockSession)
  })

  test('ポーリング成功後は認証中状態が解除される', async () => {
    vi.mocked(checkOAuthCallback).mockResolvedValueOnce(null).mockResolvedValueOnce(mockSession)
    await startAuth()
    await vi.advanceTimersByTimeAsync(1000)
    await vi.waitFor(() => expect(screen.queryByText('認証中...')).not.toBeInTheDocument())
  })

  test('ポーリングエラー時にエラーメッセージが表示される', async () => {
    vi.mocked(checkOAuthCallback).mockRejectedValueOnce(new Error('callback failed'))
    await startAuth()
    await vi.advanceTimersByTimeAsync(500)
    await vi.waitFor(() => expect(screen.getByText('callback failed')).toBeInTheDocument())
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
  })

  test('5分後にタイムアウトエラーが表示される', async () => {
    await startAuth()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    await vi.waitFor(() =>
      expect(screen.getByText('認証がタイムアウトしました。もう一度お試しください。')).toBeInTheDocument(),
    )
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
  })
})
