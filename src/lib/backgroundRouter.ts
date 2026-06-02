import { handleGetXDraft, handleOpenXCompose } from './backgroundHandlers'
import type { XDraft } from './xpost'

type Sender = { tab?: { id?: number } }

export function handleMessage(
  message: unknown,
  sender: Sender,
  sendResponse: (r: unknown) => void,
): boolean | undefined {
  const msg = message as Record<string, unknown>

  if (msg.type === 'getXDraft') {
    void handleGetXDraft(sender.tab?.id, sendResponse as (r: { draft: XDraft | null }) => void)
    return true
  }

  if (msg.type === 'openXCompose') {
    const xDraft = msg.xDraft as XDraft | undefined
    if (!xDraft) {
      ;(sendResponse as (r: { ok: boolean }) => void)({ ok: false })
      return true
    }
    void handleOpenXCompose(xDraft, (msg.imageUrls as string[]) ?? [], sendResponse as (r: { ok: boolean }) => void)
    return true
  }
}
