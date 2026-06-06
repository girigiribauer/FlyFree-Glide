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
    if (import.meta.env.VITE_FIXTURE_UPDATE === '1') {
      window.addEventListener('message', async (e: MessageEvent) => {
        if (e.data?.type !== 'flyfree:save-recording') return
        try {
          const result = await browser.runtime.sendMessage({ type: 'flyfree:save-recording', data: e.data.data })
          window.postMessage({ type: 'flyfree:recording-result', ok: result?.ok ?? false }, '*')
        } catch {
          window.postMessage({ type: 'flyfree:recording-result', ok: false }, '*')
        }
      })
    }

    const response = await browser.runtime.sendMessage({ type: 'getXDraft' })
    const draft = response?.draft
    if (!draft) return
    await waitForInjector()
    window.postMessage({ type: 'flyfree:inject', draft }, 'https://x.com')
  },
})
