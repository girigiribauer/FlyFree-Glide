import { beforeEach, describe, expect, test, vi } from 'vitest'

import { handleGetXDraft, handleOpenXCompose } from './backgroundHandlers'
import { X_COMPOSE_URL, X_POPUP_HEIGHT, X_POPUP_WIDTH } from './xpost'

describe('handleGetXDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  test('tab ID が一致するとき xDraft を返す', async () => {
    const draft = { text: 'hello', images: [] }
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { ...draft, targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(42, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ draft })
  })

  test('tab ID が一致しないとき null を返す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { text: 'hello', images: [], targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(99, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ draft: null })
  })

  test('tab ID が undefined のとき null を返す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { text: 'hello', images: [], targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(undefined, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ draft: null })
  })

  test('xDraft がない場合は null を返す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    const sendResponse = vi.fn()
    await handleGetXDraft(42, sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ draft: null })
  })

  test('tab ID が一致したとき storage から削除する', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { text: 'x', images: [], targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(42, sendResponse)
    expect(browser.storage.session.remove).toHaveBeenCalledWith('xDraft')
  })

  test('tab ID が一致しないとき storage を削除しない', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { text: 'x', images: [], targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(99, sendResponse)
    expect(browser.storage.session.remove).not.toHaveBeenCalled()
  })

  test('同じ tab ID で2回呼ぶと2回目は null を返す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ xDraft: { text: 'hello', images: [], targetTabId: 42 } })
      .mockResolvedValueOnce({})
    const r1 = vi.fn()
    const r2 = vi.fn()
    await handleGetXDraft(42, r1)
    await handleGetXDraft(42, r2)
    expect(r1).toHaveBeenCalledWith({ draft: expect.objectContaining({ text: 'hello' }) })
    expect(r2).toHaveBeenCalledWith({ draft: null })
  })

  test('返す draft に targetTabId は含まれない', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xDraft: { text: 'hello', images: [], targetTabId: 42 } })
    const sendResponse = vi.fn()
    await handleGetXDraft(42, sendResponse)
    const returned = sendResponse.mock.calls[0][0].draft
    expect(returned).not.toHaveProperty('targetTabId')
  })
})

describe('handleOpenXCompose', () => {
  beforeEach(() => vi.clearAllMocks())

  test('X のコンポーズ画面を開き targetTabId 付きで xDraft を保存する', async () => {
    ;(browser.windows.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tabs: [{ id: 42 }] })
    const xDraft = { text: 'hello', images: [] }
    const sendResponse = vi.fn()
    await handleOpenXCompose(xDraft, [], sendResponse)
    expect(browser.windows.create).toHaveBeenCalledWith({
      url: X_COMPOSE_URL,
      type: 'popup',
      width: X_POPUP_WIDTH,
      height: X_POPUP_HEIGHT,
    })
    expect(browser.storage.session.set).toHaveBeenCalledWith({ xDraft: { ...xDraft, targetTabId: 42 } })
    expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  })

  test('imageUrls が渡されたとき fetch して images に変換して保存する', async () => {
    ;(browser.windows.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tabs: [{ id: 42 }] })
    const imageData = new Uint8Array([1, 2, 3])
    const blob = new Blob([imageData], { type: 'image/jpeg' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ blob: () => Promise.resolve(blob) } as unknown as Response)

    const xDraft = { text: 'hello', images: [] }
    const sendResponse = vi.fn()
    await handleOpenXCompose(xDraft, ['https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:abc/img1@jpeg'], sendResponse)

    const stored = (browser.storage.session.set as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(stored.xDraft.images).toHaveLength(1)
    expect(stored.xDraft.images[0].mimeType).toBe('image/jpeg')
    expect(stored.xDraft.images[0].data).toBeTruthy()

    fetchSpy.mockRestore()
  })

  test('imageUrls の fetch が失敗しても images を空にして続行する', async () => {
    ;(browser.windows.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ tabs: [{ id: 42 }] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS'))

    const xDraft = { text: 'hello', images: [] }
    const sendResponse = vi.fn()
    await handleOpenXCompose(xDraft, ['https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:abc/img1@jpeg'], sendResponse)

    const stored = (browser.storage.session.set as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(stored.xDraft.images).toEqual([])
    expect(sendResponse).toHaveBeenCalledWith({ ok: true })

    fetchSpy.mockRestore()
  })

  test('windows.create が tabs を返さないとき storage に保存しない', async () => {
    ;(browser.windows.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    const xDraft = { text: 'hello', images: [] }
    const sendResponse = vi.fn()
    await handleOpenXCompose(xDraft, [], sendResponse)
    expect(browser.storage.session.set).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  })
})
