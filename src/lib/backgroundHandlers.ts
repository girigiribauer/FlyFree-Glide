import { openXCompose, type XPending } from './xpost'

export async function handleGetXPending(sendResponse: (r: { pending: unknown }) => void): Promise<void> {
  const stored = await browser.storage.session.get('xPending')
  const pending = stored.xPending ?? null
  sendResponse({ pending })
}

export async function handleOpenXCompose(xPending: XPending, sendResponse: (r: { ok: boolean }) => void): Promise<void> {
  await browser.storage.session.set({ xPending })
  openXCompose()
  sendResponse({ ok: true })
}
