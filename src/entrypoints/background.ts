import { handleGetXPending, handleOpenXCompose } from '../lib/backgroundHandlers'
import type { XPending } from '../lib/xpost'

const POPUP_WIDTH = 600
const POPUP_HEIGHT = 480

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'getXPending') {
      handleGetXPending(sendResponse)
      return true
    }
    if (message.type === 'openXCompose') {
      void handleOpenXCompose(message.xPending as XPending, sendResponse)
      return true
    }
  })

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.url || tab.title) {
      await browser.storage.session.set({ pendingPage: { url: tab.url, title: tab.title } })
    }

    const popupUrl = browser.runtime.getURL('/main.html')
    const existing = await browser.tabs.query({ url: popupUrl })
    if (existing.length > 0 && existing[0].windowId != null) {
      await browser.windows.update(existing[0].windowId, { focused: true })
      return
    }

    await browser.windows.create({
      url: popupUrl,
      type: 'popup',
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    })
  })
})
