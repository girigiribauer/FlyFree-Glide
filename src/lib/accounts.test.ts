import { beforeEach, describe, expect, test, vi } from 'vitest'

import { addStoredDid, getStoredDids, removeStoredDid } from './accounts'

beforeEach(() => {
  vi.clearAllMocks()
  ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
})

describe('getStoredDids', () => {
  test('保存がなければ空配列を返す', async () => {
    expect(await getStoredDids()).toEqual([])
  })

  test('保存済みの DID 配列を返す', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['did:plc:a', 'did:plc:b'],
    })
    expect(await getStoredDids()).toEqual(['did:plc:a', 'did:plc:b'])
  })
})

describe('addStoredDid', () => {
  test('新しい DID を追加する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['did:plc:a'],
    })
    await addStoredDid('did:plc:b')
    expect(browser.storage.sync.set).toHaveBeenCalledWith({
      accounts: ['did:plc:a', 'did:plc:b'],
    })
  })

  test('すでに存在する DID は追加しない', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['did:plc:a'],
    })
    await addStoredDid('did:plc:a')
    expect(browser.storage.sync.set).not.toHaveBeenCalled()
  })

  test('空のリストに最初の DID を追加する', async () => {
    await addStoredDid('did:plc:a')
    expect(browser.storage.sync.set).toHaveBeenCalledWith({
      accounts: ['did:plc:a'],
    })
  })
})

describe('removeStoredDid', () => {
  test('指定した DID を削除する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['did:plc:a', 'did:plc:b'],
    })
    await removeStoredDid('did:plc:a')
    expect(browser.storage.sync.set).toHaveBeenCalledWith({
      accounts: ['did:plc:b'],
    })
  })

  test('存在しない DID を削除しても問題ない', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      accounts: ['did:plc:a'],
    })
    await removeStoredDid('did:plc:x')
    expect(browser.storage.sync.set).toHaveBeenCalledWith({
      accounts: ['did:plc:a'],
    })
  })
})
