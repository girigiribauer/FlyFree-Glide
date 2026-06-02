import { extractAuthorHandle, extractText, extractUrl, findPost, getMyHandle } from '../../lib/bskyDom'
import { loadSettings } from '../../lib/settings'
import { composeTeaserText, type XPending } from '../../lib/xpost'

const INJECTED_ATTR = 'data-flyfree-x'

let lastPostText = ''
let lastPostUrl = ''

function cloneAsXMenuItem(template: HTMLElement): HTMLElement {
  const item = template.cloneNode(true) as HTMLElement
  item.setAttribute('aria-label', 'Xにも投稿')
  item.removeAttribute('data-testid')

  const textEl = item.querySelector('div[dir="auto"]')
  if (textEl) textEl.textContent = 'Xにも投稿'

  // アイコン部分（最後の div）を 𝕏 に差し替え
  const divs = item.querySelectorAll('div')
  const iconDiv = divs[divs.length - 1]
  if (iconDiv && iconDiv !== item.querySelector('div[dir="auto"]')) {
    iconDiv.innerHTML = '𝕏'
    iconDiv.style.fontWeight = '700'
  }

  return item
}

export default defineContentScript({
  matches: ['https://bsky.app/*'],
  main() {
    document.addEventListener('click', (e) => {
      lastPostText = ''
      lastPostUrl = ''
      const post = findPost(e.target as HTMLElement)
      if (!post) return
      const myHandle = getMyHandle()
      const authorHandle = extractAuthorHandle(post)
      if (!myHandle || !authorHandle || myHandle !== authorHandle) return
      lastPostText = extractText(post)
      lastPostUrl = extractUrl(post)
    }, true)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          const menu = node.getAttribute('role') === 'menu'
            ? node
            : node.querySelector('[role="menu"]')
          if (!menu || menu.hasAttribute(INJECTED_ATTR)) continue
          if (!menu.querySelector('[role="menuitem"]')) continue
          if (!lastPostText && !lastPostUrl) continue

          menu.setAttribute(INJECTED_ATTR, '1')

          const capturedText = lastPostText
          const capturedUrl = lastPostUrl
          void (async () => {
            const { xHidden, bskyXShare, xCliffhanger } = await loadSettings()
            if (xHidden || !bskyXShare) return
            const firstItem = menu.querySelector('[role="menuitem"]') as HTMLElement | null
            if (!firstItem) return
            const container = firstItem.parentElement ?? menu
            const item = cloneAsXMenuItem(firstItem)
            item.addEventListener('click', async (e) => {
              e.stopPropagation()
              const xText = xCliffhanger && capturedText && capturedUrl
                ? composeTeaserText(capturedText, capturedUrl)
                : capturedText || capturedUrl
              const xPending: XPending = { text: xText, images: [] }
              await browser.runtime.sendMessage({ type: 'openXCompose', xPending })
            })
            container.appendChild(item)
          })()
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  },
})
