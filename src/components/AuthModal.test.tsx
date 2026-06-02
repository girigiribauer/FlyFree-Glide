import type { OAuthSession } from '@atproto/oauth-client-browser'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import AuthModal from './AuthModal'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

vi.mock('../lib/auth', () => {
  class OAuthCancelledError extends Error {
    constructor() { super('cancelled') }
  }
  return {
    OAuthCancelledError,
    startOAuthFlow: vi.fn(),
  }
})

import { OAuthCancelledError, startOAuthFlow } from '../lib/auth'

const HANDLE_INPUT_PLACEHOLDER = 'example.bsky.social'
const PDS_INPUT_PLACEHOLDER = 'bsky.social'

function renderModal(closeable = false, onSuccess = vi.fn(), onClose = vi.fn()) {
  return render(() => <AuthModal closeable={closeable} onSuccess={onSuccess} onClose={onClose} />)
}

function inputHandle(value: string) {
  fireEvent.input(screen.getByPlaceholderText(HANDLE_INPUT_PLACEHOLDER), { target: { value } })
}

function inputPds(value: string) {
  fireEvent.input(screen.getByPlaceholderText(PDS_INPUT_PLACEHOLDER), { target: { value } })
}

describe('AuthModal — ログインボタンの活性制御', () => {
  test('handle が空のとき無効', () => {
    renderModal()
    expect(screen.getByText('Bluesky でログイン')).toBeDisabled()
  })

  test('handle 入力後に有効になる', () => {
    renderModal()
    inputHandle('user.bsky.social')
    expect(screen.getByText('Bluesky でログイン')).toBeEnabled()
  })

  test('空白のみは無効', () => {
    renderModal()
    inputHandle('   ')
    expect(screen.getByText('Bluesky でログイン')).toBeDisabled()
  })

  test('PDS を空にすると無効になる', () => {
    renderModal()
    inputHandle('user.bsky.social')
    inputPds('')
    expect(screen.getByText('Bluesky でログイン')).toBeDisabled()
  })
})

describe('AuthModal — 表示制御', () => {
  test('closeable=true のとき閉じるボタンが表示される', () => {
    renderModal(true)
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })

  test('closeable=false のとき × ボタンが表示されない', () => {
    renderModal(false)
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })
})

describe('AuthModal — 認証中 UI', () => {
  beforeEach(() => vi.clearAllMocks())

  test('ログイン実行で認証中状態になる', async () => {
    vi.mocked(startOAuthFlow).mockReturnValue({
      promise: new Promise(() => {}),
      cancel: vi.fn(),
    })
    renderModal()
    inputHandle('user.bsky.social')
    fireEvent.click(screen.getByText('Bluesky でログイン'))
    await vi.waitFor(() => expect(screen.getByText('認証中...')).toBeInTheDocument())
    expect(screen.getByText('Bluesky の認証画面で操作してください')).toBeInTheDocument()
    expect(screen.getByText('認証中...')).toBeDisabled()
  })

  test('認証成功後に onSuccess が呼ばれ認証中状態が解除される', async () => {
    const onSuccess = vi.fn()
    let resolve!: (s: OAuthSession) => void
    vi.mocked(startOAuthFlow).mockReturnValue({
      promise: new Promise(r => { resolve = r }),
      cancel: vi.fn(),
    })
    renderModal(false, onSuccess)
    inputHandle('user.bsky.social')
    fireEvent.click(screen.getByText('Bluesky でログイン'))
    await vi.waitFor(() => expect(screen.getByText('認証中...')).toBeInTheDocument())
    resolve(mockSession)
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith(mockSession))
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
  })
})

describe('AuthModal — エラーハンドリング', () => {
  beforeEach(() => vi.clearAllMocks())

  test('エラー発生時にエラーメッセージを表示する', async () => {
    vi.mocked(startOAuthFlow).mockReturnValue({
      promise: Promise.reject(new Error('invalid handle')),
      cancel: vi.fn(),
    })
    renderModal()
    inputHandle('invalid@@handle')
    fireEvent.click(screen.getByText('Bluesky でログイン'))
    await vi.waitFor(() => expect(screen.getByText('invalid handle')).toBeInTheDocument())
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
  })

  test('OAuthCancelledError はエラーメッセージを表示しない', async () => {
    vi.mocked(startOAuthFlow).mockReturnValue({
      promise: Promise.reject(new OAuthCancelledError()),
      cancel: vi.fn(),
    })
    renderModal()
    inputHandle('user.bsky.social')
    fireEvent.click(screen.getByText('Bluesky でログイン'))
    await vi.waitFor(() => expect(screen.getByText('Bluesky でログイン')).toBeEnabled())
    expect(screen.queryByText('認証中...')).not.toBeInTheDocument()
    expect(screen.queryByText('cancelled')).not.toBeInTheDocument()
  })
})
