import { createSignal, onCleanup } from 'solid-js'

import { extractFirstUrl, fetchLinkCard as fetchCard, type LinkCard } from '../lib/ogp'

export type { LinkCard }

export function useLinkCard(getText: () => string) {
  const [detectedUrl, setDetectedUrl] = createSignal<string | null>(null)
  const [linkCard, setLinkCard] = createSignal<LinkCard | null | undefined>(undefined)
  const [dismissedUrl, setDismissedUrl] = createSignal<string | null>(null)
  const [fetchingCard, setFetchingCard] = createSignal(false)
  let debounceId: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => clearTimeout(debounceId))

  function scheduleDetection(text: string) {
    clearTimeout(debounceId)
    debounceId = setTimeout(() => void detect(text), 500)
  }

  async function detect(text: string) {
    const url = extractFirstUrl(text)
    if (url === detectedUrl()) return
    setDetectedUrl(url)
    if (!url) {
      setLinkCard(undefined)
      setFetchingCard(false)
      return
    }
    setFetchingCard(true)
    setLinkCard(undefined)
    setDismissedUrl(null)
    const card = await fetchCard(url)
    if (extractFirstUrl(getText()) !== url) return
    setLinkCard(card)
    setFetchingCard(false)
  }

  function dismiss() {
    setDismissedUrl(detectedUrl())
  }

  return { detectedUrl, linkCard, dismissedUrl, fetchingCard, scheduleDetection, dismiss }
}
