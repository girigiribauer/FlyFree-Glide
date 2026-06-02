import { createRoot } from 'solid-js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../lib/ogp', () => ({
  extractFirstUrl: vi.fn(),
  fetchLinkCard: vi.fn(),
}))

import { useLinkCard } from './useLinkCard'

describe('useLinkCard — dismiss ロジック', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('dismiss() で dismissedUrl が detectedUrl にセットされる', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockReturnValue('https://example.com')
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    await createRoot(async dispose => {
      const { detectedUrl, dismissedUrl, scheduleDetection, dismiss } = useLinkCard(() => 'https://example.com')
      scheduleDetection('https://example.com')
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://example.com'))
      dismiss()
      expect(dismissedUrl()).toBe('https://example.com')
      dispose()
    })
  })

  test('同じ URL は dismiss したまま再表示されない', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockReturnValue('https://example.com')
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    await createRoot(async dispose => {
      const { detectedUrl, dismissedUrl, scheduleDetection, dismiss } = useLinkCard(() => 'https://example.com')
      scheduleDetection('https://example.com')
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://example.com'))
      dismiss()
      // 同じ URL → detect 内で early return するので dismissedUrl はリセットされない
      scheduleDetection('https://example.com hello')
      vi.advanceTimersByTime(500)
      expect(dismissedUrl()).toBe('https://example.com')
      dispose()
    })
  })

  test('URL が変わると dismiss がリセットされる', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockImplementation(t =>
      t.includes('https://other.com') ? 'https://other.com' :
      t.includes('https://example.com') ? 'https://example.com' : null
    )
    vi.mocked(fetchLinkCard).mockImplementation(url =>
      Promise.resolve({ url, title: 'Title', description: '', thumbUrl: null })
    )

    let currentText = 'https://example.com'
    await createRoot(async dispose => {
      const { detectedUrl, dismissedUrl, scheduleDetection, dismiss } = useLinkCard(() => currentText)
      scheduleDetection(currentText)
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://example.com'))
      dismiss()

      currentText = 'https://other.com'
      scheduleDetection(currentText)
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://other.com'))
      expect(dismissedUrl()).toBeNull()
      dispose()
    })
  })

  test('URL を消して再入力するとカードが復活する', async () => {
    const { extractFirstUrl, fetchLinkCard } = await import('../lib/ogp')
    vi.mocked(extractFirstUrl).mockImplementation(t =>
      t.includes('https://example.com') ? 'https://example.com' : null
    )
    vi.mocked(fetchLinkCard).mockResolvedValue({ url: 'https://example.com', title: 'Example', description: '', thumbUrl: null })

    let currentText = 'https://example.com'
    await createRoot(async dispose => {
      const { detectedUrl, dismissedUrl, scheduleDetection, dismiss } = useLinkCard(() => currentText)
      scheduleDetection(currentText)
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://example.com'))
      dismiss()

      currentText = 'hello'
      scheduleDetection(currentText)
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBeNull())

      currentText = 'https://example.com'
      scheduleDetection(currentText)
      vi.advanceTimersByTime(500)
      await vi.waitFor(() => expect(detectedUrl()).toBe('https://example.com'))
      expect(dismissedUrl()).toBeNull()
      dispose()
    })
  })
})
