import { render, screen, fireEvent } from '@solidjs/testing-library'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ComposeScreen from './ComposeScreen'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { MAX_GRAPHEMES } from '../../lib/composer'

vi.mock('../../lib/post', () => ({
  postToBluesky: vi.fn().mockResolvedValue('https://bsky.app/profile/test/post/abc'),
}))
vi.mock('../../lib/client', () => ({
  getOAuthClient: vi.fn().mockReturnValue({ revoke: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('../../lib/image', () => ({
  optimizeImage: vi.fn().mockResolvedValue({
    data: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    width: 100,
    height: 100,
  }),
}))

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

function renderScreen(initialText = '', onPost = vi.fn()) {
  return render(() => (
    <ComposeScreen
      session={mockSession}
      initialText={initialText}
      onPost={onPost}
      onLogout={vi.fn()}
    />
  ))
}

describe('ComposeScreen — 投稿ボタンの活性制御', () => {
  test('テキストなし・画像なしは無効', () => {
    renderScreen('')
    expect(screen.getByText('Post to Bluesky')).toBeDisabled()
  })

  test('テキストありは有効', () => {
    renderScreen('hello')
    expect(screen.getByText('Post to Bluesky')).toBeEnabled()
  })

  test('空白のみは無効', () => {
    renderScreen('   ')
    expect(screen.getByText('Post to Bluesky')).toBeDisabled()
  })

  test(`${MAX_GRAPHEMES + 1} 文字は無効`, () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES + 1))
    expect(screen.getByText('Post to Bluesky')).toBeDisabled()
  })

  test(`${MAX_GRAPHEMES} 文字は有効`, () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES))
    expect(screen.getByText('Post to Bluesky')).toBeEnabled()
  })

  test('画像のみで有効', () => {
    renderScreen('')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'test.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText('Post to Bluesky')).toBeEnabled()
  })
})

describe('ComposeScreen — 文字数カウンター', () => {
  test('超過時にカウンターが赤くなる', () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES + 1))
    const counter = screen.getByText('-1')
    expect(counter).toHaveStyle({ color: 'rgb(255, 0, 0)' })
  })

  test('制限内はカウンターが赤くならない', () => {
    renderScreen('hello')
    const counter = screen.getByText('295')
    expect(counter).not.toHaveStyle({ color: 'rgb(255, 0, 0)' })
  })
})

describe('ComposeScreen — テキスト入力', () => {
  test('テキスト入力でカウンターが更新される', () => {
    renderScreen('')
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.input(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('295')).toBeInTheDocument()
  })

  test('テキスト入力後に投稿ボタンが有効になる', () => {
    renderScreen('')
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.input(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('Post to Bluesky')).toBeEnabled()
  })
})

describe('ComposeScreen — 投稿', () => {
  beforeEach(() => vi.clearAllMocks())

  test('投稿成功後に onPost が呼ばれる', async () => {
    const onPost = vi.fn()
    renderScreen('hello', onPost)
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(onPost).toHaveBeenCalledWith('https://bsky.app/profile/test/post/abc'))
  })

  test('投稿失敗時にエラーメッセージを表示する', async () => {
    const { postToBluesky } = await import('../../lib/post')
    vi.mocked(postToBluesky).mockRejectedValueOnce(new Error('network error'))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('network error')).toBeInTheDocument())
  })

  test('投稿失敗後も投稿ボタンが再び有効になる', async () => {
    const { postToBluesky } = await import('../../lib/post')
    vi.mocked(postToBluesky).mockRejectedValueOnce(new Error('network error'))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('Post to Bluesky')).toBeEnabled())
  })

  test('投稿中はフォーム全体が無効になる', async () => {
    const { postToBluesky } = await import('../../lib/post')
    let resolvePost: (url: string) => void
    vi.mocked(postToBluesky).mockReturnValueOnce(new Promise(r => { resolvePost = r }))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Post to Bluesky'))
    await vi.waitFor(() => expect(screen.getByText('Posting...')).toBeInTheDocument())
    expect(screen.getByPlaceholderText("What's on your mind?")).toBeDisabled()
    expect(screen.getByText('Posting...')).toBeDisabled()
    expect(screen.getByText(/画像を追加/)).toBeDisabled()
    resolvePost!('https://bsky.app/profile/test/post/abc')
  })
})
