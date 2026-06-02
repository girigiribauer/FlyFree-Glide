function waitForInjector(): Promise<void> {
  return new Promise(resolve => {
    if (document.documentElement.hasAttribute('data-flyfree-ready')) {
      resolve()
      return
    }
    const observer = new MutationObserver(() => {
      if (document.documentElement.hasAttribute('data-flyfree-ready')) {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(document.documentElement, { attributes: true })
    setTimeout(resolve, 5000)
  })
}

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  async main() {
    const response = await browser.runtime.sendMessage({ type: 'getXDraft' })
    const draft = response?.draft
    if (!draft) return
    await waitForInjector()
    window.postMessage({ type: 'flyfree:inject', draft }, 'https://x.com')
  },
})
