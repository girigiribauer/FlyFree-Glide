import type { XPending } from '../../lib/xpost'

function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector)
    if (existing) { resolve(existing); return }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); clearTimeout(timer); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout: ${selector}`)) }, timeout)
  })
}

function showBanner(message: string): void {
  const banner = document.createElement('div')
  banner.textContent = message
  Object.assign(banner.style, {
    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
    background: '#1d1d1d', color: '#fff', padding: '12px 20px',
    borderRadius: '8px', fontSize: '14px', zIndex: '99999',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', maxWidth: '400px', textAlign: 'center',
  })
  document.body.appendChild(banner)
  setTimeout(() => banner.remove(), 6000)
}

function isLoginPage(): boolean {
  return location.pathname.includes('/login') ||
    location.pathname.includes('/onboarding') ||
    location.search.includes('redirect_after_login')
}

async function injectText(text: string): Promise<void> {
  const textarea = await waitForElement('[data-testid="tweetTextarea_0"]', 10000) as HTMLElement
  textarea.focus()

  const dt = new DataTransfer()
  dt.setData('text/plain', text)

  const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
  try {
    // Firefox ignores clipboardData in the ClipboardEvent constructor.
    // Defining it as an own property on the event instance makes our DataTransfer
    // visible to React's paste handler in both Chrome and Firefox.
    Object.defineProperty(event, 'clipboardData', { get: () => dt })
  } catch {
    // Defensive catch; in practice defineProperty succeeds in both browsers
  }

  textarea.dispatchEvent(event)
}

async function injectImages(images: XPending['images']): Promise<void> {
  const input = await waitForElement('[data-testid="fileInput"]', 10000).catch(
    () => waitForElement('input[type="file"]', 10000),
  ) as HTMLInputElement

  const files = images.map(({ data, mimeType, name }) => {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new File([bytes.buffer as ArrayBuffer], name, { type: mimeType })
  })

  const dt = new DataTransfer()
  files.forEach(f => dt.items.add(f))
  Object.defineProperty(input, 'files', { value: dt.files, writable: true, configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export default defineContentScript({
  matches: ['https://x.com/*', 'https://twitter.com/*'],
  world: 'MAIN',
  main() {
    window.addEventListener('message', async (e) => {
      if (e.source !== window || e.data?.type !== 'flyfree:inject') return
      const pending = e.data.pending as XPending

      if (isLoginPage()) {
        showBanner('X にログインしていないため、自動入力できませんでした。ログイン後に再度お試しください。')
        return
      }

      let textFailed = false
      try {
        await injectText(pending.text)
      } catch {
        textFailed = true
      }
      let imagesFailed = false
      try {
        if (pending.images.length > 0) await injectImages(pending.images)
      } catch {
        imagesFailed = true
      }
      if (textFailed || imagesFailed) {
        showBanner('X への自動入力に失敗しました。テキスト・画像を手動で入力してください。')
      }
    })
  },
})
