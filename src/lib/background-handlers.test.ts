import { beforeEach, describe, expect, test, vi } from 'vitest'

import { handleGetXPending } from './background-handlers'

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

  test('読み取り後に xPending を storage から削除する', async () => {
    ;(browser.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ xPending: { text: 'x', images: [] } })
    const sendResponse = vi.fn()
    await handleGetXPending(sendResponse)
    expect(browser.storage.session.remove).toHaveBeenCalledWith('xPending')
  })
})
