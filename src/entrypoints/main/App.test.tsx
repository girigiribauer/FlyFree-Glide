import type { OAuthSession } from '@atproto/oauth-client-browser'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { optimizeImage } from '../../lib/image'
import { postToBluesky } from '../../lib/post'
import { checkOAuthCallback, restoreSession } from '../../lib/session'
import { openXCompose } from '../../lib/xpost'
import App from './App'

vi.mock('../../lib/session', () => ({
  checkOAuthCallback: vi.fn(),
  restoreSession: vi.fn(),
}))
vi.mock('../../lib/post', () => ({
  postToBluesky: vi.fn().mockResolvedValue('https://bsky.app/profile/test/post/abc'),
}))
vi.mock('../../lib/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/client')>()
  return { ...actual, getOAuthClient: vi.fn().mockReturnValue({ revoke: vi.fn() }) }
})
vi.mock('../../lib/image', () => ({
  optimizeImage: vi.fn(),
}))
vi.mock('../../lib/xpost', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/xpost')>()
  return { ...actual, openXCompose: vi.fn() }
})

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

describe('App', () => {
  beforeEach(() => {
    vi.mocked(checkOAuthCallback).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue(mockSession)
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  test('pendingPage のタイトルと URL が initialText として textarea に設定される', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      pendingPage: { title: 'Test Page', url: 'https://example.com' },
    })
    render(() => <App />)
    await vi.waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.getByDisplayValue('Test Page https://example.com')).toBeInTheDocument()
  })
})

describe('App — セッションなし', () => {
  beforeEach(() => {
    vi.mocked(checkOAuthCallback).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue(null)
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  test('AuthModal が表示される', async () => {
    render(() => <App />)
    await vi.waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.getByText('Login with Bluesky')).toBeInTheDocument()
  })
})

describe('App — 投稿後の X 連携', () => {
  beforeEach(() => {
    vi.mocked(checkOAuthCallback).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue(mockSession)
    vi.mocked(optimizeImage).mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
    })
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      pendingPage: { title: 'Test Page', url: 'https://example.com' },
    })
  })

  test('投稿後に X のウィンドウが開く', async () => {
    render(() => <App />)
    await vi.waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(vi.mocked(openXCompose)).toHaveBeenCalled())
  })

  test('Bluesky 投稿が完了してから X のウィンドウが開く', async () => {
    const callOrder: string[] = []
    vi.mocked(postToBluesky).mockImplementationOnce(async () => {
      callOrder.push('postToBluesky')
      return 'https://bsky.app/profile/test/post/abc'
    })
    vi.mocked(openXCompose).mockImplementationOnce(() => {
      callOrder.push('openXCompose')
    })
    render(() => <App />)
    await vi.waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(callOrder).toHaveLength(2))
    expect(callOrder).toEqual(['postToBluesky', 'openXCompose'])
  })
})
