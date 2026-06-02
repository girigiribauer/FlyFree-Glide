import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createRoot } from 'solid-js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@atproto/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@atproto/api')>()
  return { ...actual, Agent: vi.fn() }
})

import { useMentionSearch } from './useMentionSearch'

const mockSession = { did: 'did:plc:test' } as unknown as OAuthSession

describe('useMentionSearch — search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(Agent).mockImplementation(function () {
      return {
        searchActorsTypeahead: vi.fn().mockResolvedValue({
          data: {
            actors: [
              { did: 'did:plc:u1', handle: 'alice.bsky.social', displayName: 'Alice', avatar: null },
            ],
          },
        }),
      }
    } as unknown as typeof Agent)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('schedule で 300ms 後に候補が取得される', async () => {
    await createRoot(async dispose => {
      const { candidates, schedule } = useMentionSearch(mockSession)
      schedule('alice')
      expect(candidates()).toHaveLength(0)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(1))
      expect(candidates()[0].handle).toBe('alice.bsky.social')
      dispose()
    })
  })

  test('300ms 以内に再度 schedule すると直前の検索はキャンセルされる', async () => {
    await createRoot(async dispose => {
      const { candidates, schedule } = useMentionSearch(mockSession)
      schedule('ali')
      vi.advanceTimersByTime(100)
      schedule('alice')
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(1))
      // Agent は1回しか呼ばれない（2回目の schedule が上書き）
      expect(vi.mocked(Agent)).toHaveBeenCalledTimes(1)
      dispose()
    })
  })

  test('クエリが空なら candidates が空になる', async () => {
    await createRoot(async dispose => {
      const { candidates, schedule } = useMentionSearch(mockSession)
      schedule('alice')
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(1))
      schedule('')
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(0))
      dispose()
    })
  })

  test('API エラー時は candidates が空になる', async () => {
    vi.mocked(Agent).mockImplementation(function () {
      return {
        searchActorsTypeahead: vi.fn().mockRejectedValue(new Error('network error')),
      }
    } as unknown as typeof Agent)

    await createRoot(async dispose => {
      const { candidates, schedule } = useMentionSearch(mockSession)
      schedule('alice')
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(0))
      dispose()
    })
  })
})

describe('useMentionSearch — reset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.mocked(Agent).mockImplementation(function () {
      return {
        searchActorsTypeahead: vi.fn().mockResolvedValue({
          data: { actors: [{ did: 'did:plc:u1', handle: 'alice.bsky.social', displayName: 'Alice', avatar: null }] },
        }),
      }
    } as unknown as typeof Agent)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('reset で candidates と index がクリアされる', async () => {
    await createRoot(async dispose => {
      const { candidates, index, setIndex, schedule, reset } = useMentionSearch(mockSession)
      schedule('alice')
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(candidates()).toHaveLength(1))
      setIndex(0)
      reset()
      expect(candidates()).toHaveLength(0)
      expect(index()).toBe(0)
      dispose()
    })
  })
})
