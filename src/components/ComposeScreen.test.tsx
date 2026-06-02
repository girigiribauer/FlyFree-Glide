import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createEvent, fireEvent, render, screen } from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@atproto/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@atproto/api')>()
  return { ...actual, Agent: vi.fn() }
})

import type { AccountInfo } from '../lib/accounts'
import { MAX_GRAPHEMES } from '../lib/composer'
import { DEFAULT_SETTINGS, makeDefaultLabelOption, makeDefaultLangOption, makeDefaultReactionOption, type Settings } from '../lib/settings'
import ComposeScreen from './ComposeScreen'

vi.mock('../lib/post', () => ({
  postToBluesky: vi.fn().mockResolvedValue('https://bsky.app/profile/test/post/abc'),
}))
vi.mock('../lib/image', () => ({
  optimizeImage: vi.fn().mockResolvedValue({
    data: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    width: 100,
    height: 100,
  }),
}))
vi.mock('../lib/ogp', () => ({
  extractFirstUrl: vi.fn().mockReturnValue(null),
  fetchLinkCard: vi.fn().mockResolvedValue(null),
}))
vi.mock('emoji-mart', () => ({ init: vi.fn() }))
vi.mock('@emoji-mart/data', () => ({ default: {} }))

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession
const mockCurrentUser: AccountInfo = { did: 'did:plc:test', handle: 'test.bsky.social' }

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    langOptions: [makeDefaultLangOption()],
    reactionOptions: [makeDefaultReactionOption()],
    labelOptions: [makeDefaultLabelOption()],
    xHidden: true,
    ...overrides,
  }
}

function renderScreen(initialText = '', onPost = vi.fn()) {
  return render(() => (
    <ComposeScreen
      session={mockSession}
      currentUser={mockCurrentUser}
      initialText={initialText}
      accounts={[]}
      settings={makeSettings()}
      onSettingsChange={vi.fn()}
      onOpenSettings={vi.fn()}
      onPost={onPost}
      onSwitchAccount={vi.fn()}
      onAddAccount={vi.fn()}
      onLogout={vi.fn()}
    />
  ))
}

describe('ComposeScreen — 投稿ボタンの活性制御', () => {
  test('テキストなし・画像なしは無効', () => {
    renderScreen('')
    expect(screen.getByText('Bluesky に投稿')).toBeDisabled()
  })

  test('テキストありは有効', () => {
    renderScreen('hello')
    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })

  test('空白のみは無効', () => {
    renderScreen('   ')
    expect(screen.getByText('Bluesky に投稿')).toBeDisabled()
  })

  test(`${MAX_GRAPHEMES + 1} 文字は無効`, () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES + 1))
    expect(screen.getByText('Bluesky に投稿')).toBeDisabled()
  })

  test(`${MAX_GRAPHEMES} 文字は有効`, () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES))
    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })

  test('画像のみで有効', () => {
    renderScreen('')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'test.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })
})

describe('ComposeScreen — 文字数カウンター', () => {
  test('超過時にカウンターに counterOverLimit クラスが付く', () => {
    renderScreen('a'.repeat(MAX_GRAPHEMES + 1))
    const counter = screen.getByText(`${MAX_GRAPHEMES + 1}/${MAX_GRAPHEMES}`)
    expect(counter.className).toMatch(/counterOverLimit/)
  })

  test('制限内はカウンターに counterOverLimit クラスが付かない', () => {
    renderScreen('hello')
    const counter = screen.getByText('5/300')
    expect(counter.className).not.toMatch(/counterOverLimit/)
  })
})

describe('ComposeScreen — テキスト入力', () => {
  test('テキスト入力でカウンターが更新される', () => {
    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？')
    fireEvent.input(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('5/300')).toBeInTheDocument()
  })

  test('テキスト入力後に投稿ボタンが有効になる', () => {
    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？')
    fireEvent.input(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })
})

describe('ComposeScreen — 投稿', () => {
  beforeEach(() => vi.clearAllMocks())

  test('投稿成功後に onPost が呼ばれる', async () => {
    const onPost = vi.fn()
    renderScreen('hello', onPost)
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(onPost).toHaveBeenCalledWith(
      'https://bsky.app/profile/test/post/abc',
      expect.objectContaining({ text: 'hello' }),
    ))
  })

  test('テキストのみ投稿後に onPost に xPending が渡される', async () => {
    const onPost = vi.fn()
    renderScreen('hello', onPost)
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() =>
      expect(onPost).toHaveBeenCalledWith(
        'https://bsky.app/profile/test/post/abc',
        { text: 'hello', images: [] },
      )
    )
  })

  test('画像つき投稿後に onPost に xPending が渡される', async () => {
    const onPost = vi.fn()
    renderScreen('hello', onPost)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['img'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() =>
      expect(onPost).toHaveBeenCalledWith(
        'https://bsky.app/profile/test/post/abc',
        {
          text: 'hello',
          images: [{ data: 'AQID', mimeType: 'image/jpeg', name: 'photo.jpg' }],
        },
      )
    )
  })

  test('投稿失敗時にエラーメッセージを表示する', async () => {
    const { postToBluesky } = await import('../lib/post')
    vi.mocked(postToBluesky).mockRejectedValueOnce(new Error('network error'))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(screen.getByText('network error')).toBeInTheDocument())
  })

  test('投稿失敗後も投稿ボタンが再び有効になる', async () => {
    const { postToBluesky } = await import('../lib/post')
    vi.mocked(postToBluesky).mockRejectedValueOnce(new Error('network error'))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(screen.getByText('Bluesky に投稿')).toBeEnabled())
  })

  test('投稿中はフォーム全体が無効になる', async () => {
    const { postToBluesky } = await import('../lib/post')
    let resolvePost: (url: string) => void
    vi.mocked(postToBluesky).mockReturnValueOnce(new Promise(r => { resolvePost = r }))
    renderScreen('hello')
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(screen.getByText('投稿しています...')).toBeInTheDocument())
    expect(screen.getByPlaceholderText('今なにしてる？')).toBeDisabled()
    expect(screen.getByText('投稿しています...')).toBeDisabled()
    expect(screen.queryByRole('button', { name: '画像を追加' })).not.toBeInTheDocument()
    resolvePost!('https://bsky.app/profile/test/post/abc')
  })
})

describe('ComposeScreen — ログアウト', () => {
  beforeEach(() => vi.clearAllMocks())

  test('アカウントメニューからログアウトできる', () => {
    const onLogout = vi.fn()
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings()}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={onLogout}
      />
    ))
    fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }))
    fireEvent.click(screen.getByText('ログアウト'))
    expect(onLogout).toHaveBeenCalled()
  })
})

describe('ComposeScreen — 文字数カウンター（リンクカードあり）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('リンクカード表示中はカードURLを除いた文字数でカウントされる', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockReturnValue('https://example.com')
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？')
    fireEvent.input(textarea, { target: { value: 'hello https://example.com' } })
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => expect(screen.getByText('Example')).toBeInTheDocument())

    expect(screen.getByText('5/300')).toBeInTheDocument()
  })

  test('リンクカード表示中にカード分のURLで超過しても投稿ボタンが有効になる', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockReturnValue('https://example.com')
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    const baseText = 'a'.repeat(MAX_GRAPHEMES)
    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？')
    fireEvent.input(textarea, { target: { value: baseText + ' https://example.com' } })
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => expect(screen.getByText('Example')).toBeInTheDocument())

    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })
})

describe('ComposeScreen — リンクカード', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('×ボタンでリンクカードが非表示になる', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockReturnValue('https://example.com')
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？')
    fireEvent.input(textarea, { target: { value: 'https://example.com' } })
    vi.advanceTimersByTime(500)
    await vi.waitFor(() => expect(screen.getByText('Example')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'リンクカードを削除' }))
    expect(screen.queryByText('Example')).not.toBeInTheDocument()
  })

})

describe('ComposeScreen — ラベルオプション', () => {
  beforeEach(() => vi.clearAllMocks())

  test('画像なし投稿では labels が postToBluesky に渡らない', async () => {
    const { postToBluesky } = await import('../lib/post')
    const labelOpt = { ...makeDefaultLabelOption(), id: 'l1', labels: ['sexual'] as ['sexual'] }
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText="hello"
        accounts={[]}
        settings={makeSettings({ labelOptions: [labelOpt] })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(postToBluesky).toHaveBeenCalled())
    const opts = vi.mocked(postToBluesky).mock.calls[0][4]
    expect(opts?.labels).toBeUndefined()
  })

  test('画像あり投稿では selectedLabel の labels が postToBluesky に渡る', async () => {
    const { postToBluesky } = await import('../lib/post')
    const labelOpt = { ...makeDefaultLabelOption(), id: 'l1', labels: ['sexual'] as ['sexual'] }
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText="hello"
        accounts={[]}
        settings={makeSettings({ labelOptions: [labelOpt] })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['img'], 'photo.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText('Bluesky に投稿'))
    await vi.waitFor(() => expect(postToBluesky).toHaveBeenCalled())
    const opts = vi.mocked(postToBluesky).mock.calls[0][4]
    expect(opts?.labels).toEqual(['sexual'])
  })
})

describe('ComposeScreen — X カウンター', () => {
  test('xHidden が false のとき X カウンターが表示される', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText="hello"
        accounts={[]}
        settings={makeSettings({ xHidden: false })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    expect(screen.getByText('5/280')).toBeInTheDocument()
  })

  test('xHidden が true のとき X カウンターが非表示', () => {
    renderScreen('hello')
    expect(screen.queryByText('5/280')).not.toBeInTheDocument()
  })
})

describe('ComposeScreen — 絵文字', () => {
  function selectEmoji(native: string) {
    const picker = document.querySelector('em-emoji-picker') as HTMLElement & { props: { onEmojiSelect: (e: { native: string }) => void } }
    picker.props.onEmojiSelect({ native })
  }

  test('絵文字ボタンをクリックするとピッカーが開く', () => {
    renderScreen('hello')
    fireEvent.click(screen.getByRole('button', { name: '絵文字を追加' }))
    expect(document.querySelector('em-emoji-picker')).toBeInTheDocument()
  })

  test('絵文字を選択してもピッカーは閉じない', () => {
    renderScreen('hello')
    fireEvent.click(screen.getByRole('button', { name: '絵文字を追加' }))
    selectEmoji('😊')
    expect(document.querySelector('em-emoji-picker')).toBeInTheDocument()
  })

})

describe('ComposeScreen — チップ選択', () => {
  test('langOptions が1つのときも言語チップはクリック可能', () => {
    renderScreen('')
    const langChip = screen.getAllByRole('button').find(b => b.textContent?.includes('言語指定なし'))
    expect(langChip).toBeEnabled()
  })

  test('langOptions が複数のとき言語チップをクリックするとポップアップが開く', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ langOptions: [{ id: 'a', langs: ['ja'] }, { id: 'b', langs: ['en'] }] })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    const langChip = screen.getAllByRole('button').find(b => b.textContent?.includes('日本語'))!
    fireEvent.click(langChip)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('labelOptions が複数でも画像なしではラベルチップは非表示', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ labelOptions: [{ ...makeDefaultLabelOption(), id: 'a' }, { ...makeDefaultLabelOption(), id: 'b' }] })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    expect(screen.queryByText('ラベルなし')).not.toBeInTheDocument()
  })

  test('画像追加後にラベルチップが表示される', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ labelOptions: [{ ...makeDefaultLabelOption(), id: 'a' }, { ...makeDefaultLabelOption(), id: 'b' }] })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['img'], 'photo.jpg', { type: 'image/jpeg' })] } })
    expect(screen.getByText('ラベルなし')).toBeInTheDocument()
  })
})

describe('ComposeScreen — ドラッグ&ドロップ', () => {
  test('画像ファイルをドロップするとポスト可能になる', () => {
    const { container } = renderScreen('')
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    const dropZone = container.firstChild as HTMLElement
    const dropEvent = createEvent.drop(dropZone)
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] },
    })
    fireEvent(dropZone, dropEvent)
    expect(screen.getByText('Bluesky に投稿')).toBeEnabled()
  })

  test('画像ファイル以外をドロップしてもポスト不可のまま', () => {
    const { container } = renderScreen('')
    const file = new File(['text'], 'readme.txt', { type: 'text/plain' })
    const dropZone = container.firstChild as HTMLElement
    const dropEvent = createEvent.drop(dropZone)
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] },
    })
    fireEvent(dropZone, dropEvent)
    expect(screen.getByText('Bluesky に投稿')).toBeDisabled()
  })
})

describe('ComposeScreen — X チップ', () => {
  test('xHidden=true のとき X チップが非表示', () => {
    renderScreen('')
    expect(screen.queryByText(/チラ見せモード/)).not.toBeInTheDocument()
  })

  test('xHidden=false かつ xCliffhanger=false のとき「チラ見せモードOFF」を表示', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ xHidden: false, xCliffhanger: false })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    expect(screen.getByText('チラ見せモードOFF')).toBeInTheDocument()
  })

  test('xHidden=false かつ xCliffhanger=true のとき「チラ見せモードON」を表示', () => {
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ xHidden: false, xCliffhanger: true })}
        onSettingsChange={vi.fn()}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    expect(screen.getByText('チラ見せモードON')).toBeInTheDocument()
  })

  test('X チップをクリックすると onSettingsChange が呼ばれる', () => {
    const onSettingsChange = vi.fn()
    render(() => (
      <ComposeScreen
        session={mockSession}
        currentUser={mockCurrentUser}
        initialText=""
        accounts={[]}
        settings={makeSettings({ xHidden: false, xCliffhanger: false })}
        onSettingsChange={onSettingsChange}
        onOpenSettings={vi.fn()}
        onPost={vi.fn()}
        onSwitchAccount={vi.fn()}
        onAddAccount={vi.fn()}
        onLogout={vi.fn()}
      />
    ))
    fireEvent.click(screen.getByText('チラ見せモードOFF'))
    expect(onSettingsChange).toHaveBeenCalledWith({ xCliffhanger: true })
  })
})

describe('ComposeScreen — メンション補完', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    const mockAgent = {
      searchActorsTypeahead: vi.fn().mockResolvedValue({
        data: {
          actors: [
            { did: 'did:plc:u1', handle: 'alice.bsky.social', displayName: 'Alice', avatar: null },
          ],
        },
      }),
    }
    vi.mocked(Agent).mockImplementation(function MockAgent() {
      return mockAgent
    } as unknown as typeof Agent)
  })

  test('@入力でメンション候補ドロップダウンが表示される', async () => {
    renderScreen('')
    await user.type(screen.getByPlaceholderText('今なにしてる？'), '@alice')
    await vi.waitFor(() => expect(screen.getByText('@alice.bsky.social')).toBeInTheDocument())
  })

  test('候補をクリックするとハンドルが挿入される', async () => {
    renderScreen('')
    const textarea = screen.getByPlaceholderText('今なにしてる？') as HTMLTextAreaElement
    await user.type(textarea, '@alice')
    await vi.waitFor(() => expect(screen.getByText('@alice.bsky.social')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@alice.bsky.social'))
    expect(textarea).toHaveValue('@alice.bsky.social ')
  })
})
