import { render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import type { OAuthSession } from '@atproto/oauth-client-browser'

vi.mock('../../lib/session', () => ({
  checkOAuthCallback: vi.fn(),
  restoreSession: vi.fn(),
}))
vi.mock('../../lib/post', () => ({
  postToBluesky: vi.fn().mockResolvedValue('https://bsky.app/profile/test/post/abc'),
}))
vi.mock('../../lib/client', () => ({
  getOAuthClient: vi.fn().mockReturnValue({ revoke: vi.fn() }),
}))
vi.mock('../../lib/image', () => ({
  optimizeImage: vi.fn(),
}))

import { checkOAuthCallback, restoreSession } from '../../lib/session'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

describe('App', () => {
  beforeEach(() => {
    vi.mocked(checkOAuthCallback).mockResolvedValue(null)
    vi.mocked(restoreSession).mockResolvedValue(mockSession)
    ;(chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  test('pendingPage のタイトルと URL が initialText として textarea に設定される', async () => {
    ;(chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      pendingPage: { title: 'Test Page', url: 'https://example.com' },
    })
    render(() => <App />)
    await vi.waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    expect(screen.getByDisplayValue('Test Page https://example.com')).toBeInTheDocument()
  })
})
