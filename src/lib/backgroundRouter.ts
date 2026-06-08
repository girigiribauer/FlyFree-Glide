import { handleGetXDraft, handleOpenXCompose } from './backgroundHandlers'
import type { XDraft } from './xpost'

type Sender = { tab?: { id?: number } }

type IncomingMessage =
  | { type: 'getXDraft' }
  | { type: 'openXCompose'; xDraft: XDraft; imageUrls?: string[] }

export function handleMessage(
  message: unknown,
  sender: Sender,
  sendResponse: (r: unknown) => void,
): boolean | undefined {
  const msg = message as IncomingMessage

  if (msg.type === 'getXDraft') {
    void handleGetXDraft(sender.tab?.id, sendResponse as (r: { draft: XDraft | null }) => void)
    return true
  }

  if (msg.type === 'openXCompose') {
    if (!msg.xDraft) {
      ;(sendResponse as (r: { ok: boolean }) => void)({ ok: false })
      return true
    }
    void handleOpenXCompose(msg.xDraft, msg.imageUrls ?? [], sendResponse as (r: { ok: boolean }) => void)
    return true
  }
}
