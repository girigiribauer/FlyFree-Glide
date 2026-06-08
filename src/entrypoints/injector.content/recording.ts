import { X_SEL } from '../../lib/xDom'

// Recording mode: npm run test:e2e:record でビルドしたときのみ有効

function isRecording(): boolean {
  return import.meta.env.VITE_FIXTURE_UPDATE === '1'
}

function findContainer(): Element | null {
  const textarea = document.querySelector(`${X_SEL.modal} ${X_SEL.tweetTextarea}`)
  if (!textarea) return null
  let el: Element = textarea
  while (el.parentElement && el.parentElement !== document.body) {
    el = el.parentElement
    if (el.querySelector(`${X_SEL.fileInput}, ${X_SEL.fileInputFallback}`)) return el
  }
  return el
}

function captureHtml(container: Element): string {
  const clone = container.cloneNode(true) as Element
  clone.querySelectorAll('style, script, link[rel=stylesheet]').forEach(n => n.remove())
  clone.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'))
  return clone.outerHTML
}

type MutationEntry = {
  type: string
  target: string
  oldValue?: string
  newValue?: string
  attributeName?: string
  addedCount: number
  removedCount: number
}

function startObserver(container: Element): { stop: () => MutationEntry[] } {
  const entries: MutationEntry[] = []
  const obs = new MutationObserver(records => {
    for (const r of records) {
      const testid = (r.target as HTMLElement).dataset?.testid
      entries.push({
        type: r.type,
        target: testid ? `[data-testid="${testid}"]` : r.target.nodeName,
        oldValue: r.oldValue?.slice(0, 300),
        newValue:
          r.type === 'characterData'
            ? r.target.textContent?.slice(0, 300)
            : r.type === 'attributes'
            ? (r.target as Element).getAttribute(r.attributeName!) ?? undefined
            : undefined,
        attributeName: r.attributeName ?? undefined,
        addedCount: r.addedNodes.length,
        removedCount: r.removedNodes.length,
      })
    }
  })
  obs.observe(container, {
    childList: true, subtree: true,
    characterData: true, characterDataOldValue: true,
    attributes: true, attributeOldValue: true,
  })
  return { stop: () => { obs.disconnect(); return entries } }
}

function waitForTextarea(timeout = 10000): Promise<Element | null> {
  const existing = document.querySelector(`${X_SEL.modal} ${X_SEL.tweetTextarea}`)
  if (existing) return Promise.resolve(existing)
  return new Promise(resolve => {
    const obs = new MutationObserver(() => {
      const el = document.querySelector(`${X_SEL.modal} ${X_SEL.tweetTextarea}`)
      if (el) { obs.disconnect(); clearTimeout(timer); resolve(el) }
    })
    obs.observe(document.body, { childList: true, subtree: true })
    const timer = setTimeout(() => { obs.disconnect(); resolve(null) }, timeout)
  })
}

function save(data: object, showBanner: (msg: string) => void): Promise<void> {
  // Fetch must run in ISOLATED world to bypass x.com CSP.
  // Post to recording-relay.content.ts and wait for the result.
  window.postMessage({ type: 'flyfree:save-recording', data }, '*')
  return new Promise(resolve => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'flyfree:recording-result') return
      window.removeEventListener('message', handler)
      clearTimeout(timer)
      if (e.data.ok) showBanner('✓ x-composer.recording.json を保存しました')
      else showBanner('記録サーバーへの保存に失敗しました。npm run test:e2e:record が起動していますか？')
      resolve()
    }
    window.addEventListener('message', handler)
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler)
      showBanner('記録サーバーへの保存がタイムアウトしました')
      resolve()
    }, 10_000)
  })
}

export interface RecordingSession {
  checkpoint(): void
  finish(): Promise<void>
}

export async function startRecordingSession(
  showBanner: (message: string) => void,
): Promise<RecordingSession | null> {
  if (!isRecording()) return null

  await waitForTextarea()
  const container = findContainer()
  if (!container) return null

  const initial = captureHtml(container)
  const obs = startObserver(container)
  let afterText: string | null = null
  let textMutations: MutationEntry[] | null = null
  let obs2: ReturnType<typeof startObserver> | null = null

  return {
    checkpoint() {
      afterText = captureHtml(container)
      textMutations = obs.stop()
      obs2 = startObserver(container)
    },
    async finish() {
      const afterImage = captureHtml(container)
      const imageMutations = obs2?.stop() ?? null
      await save(
        {
          recorded_at: new Date().toISOString(),
          initial,
          after_text_injection: afterText,
          after_image_injection: afterImage,
          text_mutations: textMutations,
          image_mutations: imageMutations,
        },
        showBanner,
      )
    },
  }
}
