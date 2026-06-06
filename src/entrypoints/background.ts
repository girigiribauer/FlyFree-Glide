import { handleMessage } from '../lib/backgroundRouter'

const POPUP_WIDTH = 600
const POPUP_HEIGHT = 480

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(handleMessage)

  if (import.meta.env.VITE_FIXTURE_UPDATE === '1') {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const msg = message as { type?: string; data?: object }
      if (msg.type !== 'flyfree:save-recording') return false
      void fetch('http://localhost:7331/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.data ?? {}),
      }).then(r => sendResponse({ ok: r.ok })).catch(() => sendResponse({ ok: false }))
      return true
    })
  }

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
