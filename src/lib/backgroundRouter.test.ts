import { beforeEach, describe, expect, test, vi } from 'vitest'

import { handleGetXDraft, handleOpenXCompose } from './backgroundHandlers'
import { handleMessage } from './backgroundRouter'

vi.mock('./backgroundHandlers', () => ({
  handleGetXDraft: vi.fn(),
  handleOpenXCompose: vi.fn(),
}))

describe('handleMessage', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getXDraft', () => {
    test('sender.tab.id を handleGetXDraft に渡す', () => {
      const sendResponse = vi.fn()
      handleMessage({ type: 'getXDraft' }, { tab: { id: 42 } }, sendResponse)
      expect(handleGetXDraft).toHaveBeenCalledWith(42, sendResponse)
    })

    test('tab がない場合は undefined を渡す', () => {
      const sendResponse = vi.fn()
      handleMessage({ type: 'getXDraft' }, {}, sendResponse)
      expect(handleGetXDraft).toHaveBeenCalledWith(undefined, sendResponse)
    })

    test('true を返す（非同期レスポンスのため）', () => {
      const result = handleMessage({ type: 'getXDraft' }, { tab: { id: 1 } }, vi.fn())
      expect(result).toBe(true)
    })
  })

  describe('openXCompose', () => {
    test('xDraft を handleOpenXCompose に渡す', () => {
      const xDraft = { text: 'hello', images: [] }
      const imageUrls = ['https://example.com/img.jpg']
      const sendResponse = vi.fn()
      handleMessage({ type: 'openXCompose', xDraft, imageUrls }, {}, sendResponse)
      expect(handleOpenXCompose).toHaveBeenCalledWith(xDraft, imageUrls, sendResponse)
    })

    test('imageUrls がない場合は空配列を渡す', () => {
      const xDraft = { text: 'hello', images: [] }
      const sendResponse = vi.fn()
      handleMessage({ type: 'openXCompose', xDraft }, {}, sendResponse)
      expect(handleOpenXCompose).toHaveBeenCalledWith(xDraft, [], sendResponse)
    })

    test('xDraft がない場合は handleOpenXCompose を呼ばず { ok: false } を返す', () => {
      const sendResponse = vi.fn()
      handleMessage({ type: 'openXCompose' }, {}, sendResponse)
      expect(handleOpenXCompose).not.toHaveBeenCalled()
      expect(sendResponse).toHaveBeenCalledWith({ ok: false })
    })

    test('true を返す（非同期レスポンスのため）', () => {
      const result = handleMessage({ type: 'openXCompose', xDraft: { text: '', images: [] } }, {}, vi.fn())
      expect(result).toBe(true)
    })
  })

  describe('未知のメッセージタイプ', () => {
    test('何も呼ばず undefined を返す', () => {
      const sendResponse = vi.fn()
      const result = handleMessage({ type: 'unknown' }, {}, sendResponse)
      expect(handleGetXDraft).not.toHaveBeenCalled()
      expect(handleOpenXCompose).not.toHaveBeenCalled()
      expect(sendResponse).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })
})
