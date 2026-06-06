import { type BrowserContext, type Page } from '@playwright/test'
import * as net from 'net'
import * as path from 'path'
import { chromium } from 'playwright-extra'
import { firefox } from 'playwright'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

const chromeExtPath = path.resolve('.output/chrome-mv3')
const ffExtPath = path.resolve('.output/firefox-mv3')

const chromeUserDataDir = path.resolve('tests/e2e/.userdata/chrome')
const firefoxUserDataDir = path.resolve('tests/e2e/.userdata/firefox')

const FF_RDP_PORT = 56432

chromium.use(StealthPlugin())

export type BrowserName = 'chromium' | 'firefox'

// Firefox does not expose extension service workers via Playwright's serviceWorkers().
// We install the extension after launch via Firefox RDP (Remote Debugging Protocol).
function installAddonViaRDP(addonPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(FF_RDP_PORT, 'localhost', () => {
      let buf = Buffer.alloc(0)
      client.on('data', (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])
        while (true) {
          const colon = buf.indexOf(':')
          if (colon === -1) break
          const len = parseInt(buf.subarray(0, colon).toString(), 10)
          if (isNaN(len)) { reject(new Error('invalid RDP packet')); return }
          const start = colon + 1
          if (buf.length < start + len) break
          const pkt = JSON.parse(buf.subarray(start, start + len).toString()) as Record<string, unknown>
          buf = buf.subarray(start + len)
          if (pkt['applicationType']) send({ to: 'root', type: 'getRoot' })
          if (pkt['addonsActor']) send({ to: pkt['addonsActor'], type: 'installTemporaryAddon', addonPath })
          if (pkt['addon']) { resolve((pkt['addon'] as { id: string }).id); client.destroy() }
          if (pkt['error']) { reject(new Error(pkt['message'] as string)); client.destroy() }
        }
      })
    })
    client.on('error', reject)
    function send(msg: Record<string, unknown>) {
      const s = JSON.stringify(msg)
      client.write(`${s.length}:${s}`)
    }
  })
}

export async function launchChrome(): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(chromeUserDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--force-color-profile'],
    args: [
      '--headless=new',
      '--disable-blink-features=AutomationControlled',
      `--disable-extensions-except=${chromeExtPath}`,
      `--load-extension=${chromeExtPath}`,
    ],
    viewport: { width: 1440, height: 900 },
    screen: { width: 1920, height: 1080 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  }) as unknown as BrowserContext

  await context.addInitScript(() => {
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 })
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 10 })
  })

  return context
}

export async function launchFirefox(): Promise<BrowserContext> {
  const context = await firefox.launchPersistentContext(firefoxUserDataDir, {
    headless: true,
    args: ['-start-debugger-server', String(FF_RDP_PORT)],
    firefoxUserPrefs: {
      'devtools.debugger.remote-enabled': true,
      'devtools.debugger.prompt-connection': false,
    },
    viewport: { width: 1440, height: 900 },
    screen: { width: 1920, height: 1080 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  }) as unknown as BrowserContext

  // Give Firefox time to start the RDP server before connecting
  await new Promise(r => setTimeout(r, 2000))
  await installAddonViaRDP(ffExtPath)

  return context
}

export async function launch(browserName: BrowserName): Promise<BrowserContext> {
  return browserName === 'firefox' ? launchFirefox() : launchChrome()
}

// Waits for injector.content (MAIN world) to register on the given page.
export async function waitForExtensionReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-flyfree-ready]', { timeout: 15_000 })
}
