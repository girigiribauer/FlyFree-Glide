const POPUP_WIDTH = 600
const POPUP_HEIGHT = 600

export default defineBackground(() => {
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url || tab.title) {
      await chrome.storage.session.set({ pendingPage: { url: tab.url, title: tab.title } })
    }

    const popupUrl = chrome.runtime.getURL('main.html')
    const existing = await chrome.tabs.query({ url: popupUrl })
    if (existing.length > 0 && existing[0].windowId != null) {
      await chrome.windows.update(existing[0].windowId, { focused: true })
      return
    }

    await chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    })
  })
})
