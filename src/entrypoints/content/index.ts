export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  async main() {
    const response = await browser.runtime.sendMessage({ type: 'getXPending' })
    const pending = response?.pending
    if (!pending) return
    window.postMessage({ type: 'flyfree:inject', pending }, 'https://x.com')
  },
})
