import { beforeEach, describe, expect, test, vi } from 'vitest'

import { handleGetXPending, handleOpenXCompose } from './backgroundHandlers'
import { X_COMPOSE_URL, X_POPUP_HEIGHT, X_POPUP_WIDTH } from './xpost'

describe('handleGetXPending', () => {
  beforeEach(() => vi.clearAllMocks())

  test('保存されている xPending を返す', async () => {
    const pending = { text: 'hello', images: [] }
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xPending: pending })
    const sendResponse = vi.fn()
    await handleGetXPending(sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ pending })
  })

  test('xPending がない場合は null を返す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    const sendResponse = vi.fn()
    await handleGetXPending(sendResponse)
    expect(sendResponse).toHaveBeenCalledWith({ pending: null })
  })

  test('読み取り後も xPending を storage に残す', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xPending: { text: 'x', images: [] } })
    const sendResponse = vi.fn()
    await handleGetXPending(sendResponse)
    expect(browser.storage.session.remove).not.toHaveBeenCalled()
  })

  test('2回連続で呼んでも同じ xPending を返す', async () => {
    const pending = { text: 'hello', images: [] }
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ xPending: pending })
      .mockResolvedValueOnce({ xPending: pending })
    const r1 = vi.fn()
    const r2 = vi.fn()
    await handleGetXPending(r1)
    await handleGetXPending(r2)
    expect(r1).toHaveBeenCalledWith({ pending })
    expect(r2).toHaveBeenCalledWith({ pending })
  })
})

describe('handleOpenXCompose', () => {
  beforeEach(() => vi.clearAllMocks())

  test('xPending を storage に保存して X のコンポーズ画面を開く', async () => {
    const xPending = { text: 'hello', images: [] }
    const sendResponse = vi.fn()
    await handleOpenXCompose(xPending, sendResponse)
    expect(browser.storage.session.set).toHaveBeenCalledWith({ xPending })
    expect(browser.windows.create).toHaveBeenCalledWith({
      url: X_COMPOSE_URL,
      type: 'popup',
      width: X_POPUP_WIDTH,
      height: X_POPUP_HEIGHT,
    })
    expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  })
})
