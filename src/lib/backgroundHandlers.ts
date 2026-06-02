import { X_COMPOSE_URL, X_POPUP_HEIGHT, X_POPUP_WIDTH, type XDraft } from './xpost'

type XDraftStored = XDraft & { targetTabId: number }

export async function handleGetXDraft(senderTabId: number | undefined, sendResponse: (r: { draft: XDraft | null }) => void): Promise<void> {
  const stored = await browser.storage.session.get('xDraft')
  const entry = stored.xDraft as XDraftStored | undefined
  if (!entry || entry.targetTabId !== senderTabId) {
    sendResponse({ draft: null })
    return
  }
  await browser.storage.session.remove('xDraft')
  const { targetTabId: _ignored, ...draft } = entry
  sendResponse({ draft })
}

async function fetchImages(urls: string[]): Promise<XDraft['images']> {
  const images: XDraft['images'] = []
  for (const url of urls) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ab = await blob.arrayBuffer()
      const bytes = new Uint8Array(ab)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      images.push({ data: btoa(binary), mimeType: blob.type || 'image/jpeg', name: url.split('/').pop() ?? 'image.jpg' })
    } catch {
      // skip
    }
  }
  return images
}

export async function handleOpenXCompose(xDraft: XDraft, imageUrls: string[], sendResponse: (r: { ok: boolean }) => void): Promise<void> {
  const images = imageUrls.length > 0 ? await fetchImages(imageUrls) : xDraft.images
  const win = await browser.windows.create({ url: X_COMPOSE_URL, type: 'popup', width: X_POPUP_WIDTH, height: X_POPUP_HEIGHT }) ?? {}
  const targetTabId = (win as { tabs?: { id?: number }[] }).tabs?.[0]?.id
  if (targetTabId !== undefined) {
    await browser.storage.session.set({ xDraft: { text: xDraft.text, images, targetTabId } })
  }
  sendResponse({ ok: true })
}
