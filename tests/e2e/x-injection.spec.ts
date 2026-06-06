import * as fs from 'fs'
import * as path from 'path'
import { expect, test } from '@playwright/test'

import { launch, waitForExtensionReady, type BrowserName } from './helpers/browser.ts'

const fixturePath = path.resolve('tests/e2e/fixtures/x-composer.html')
const fixtureHtml = fs.readFileSync(fixturePath, 'utf-8')

async function openComposePage(context: Awaited<ReturnType<typeof launch>>) {
  await context.route('https://x.com/**', route =>
    route.fulfill({ contentType: 'text/html', body: fixtureHtml }),
  )
  const page = await context.newPage()
  await page.goto('https://x.com/compose/post')
  await waitForExtensionReady(page)
  return page
}

test('text is injected into X compose window', async ({}, testInfo) => {
  const browserName = testInfo.project.name as BrowserName
  const context = await launch(browserName)
  const page = await openComposePage(context)

  await page.evaluate(() => {
    window.postMessage(
      { type: 'flyfree:inject', draft: { text: 'hello injection test', images: [] } },
      'https://x.com',
    )
  })

  await page.waitForFunction(() => (window as any).__injectedText !== undefined, { timeout: 5_000 })
  const injectedText = await page.evaluate(() => (window as any).__injectedText)
  expect(injectedText).toBe('hello injection test')

  await context.close()
})

test('image is injected into X compose window', async ({}, testInfo) => {
  const browserName = testInfo.project.name as BrowserName
  const context = await launch(browserName)
  const page = await openComposePage(context)

  // 1x1 透過 PNG の base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  await page.evaluate((b64) => {
    window.postMessage(
      {
        type: 'flyfree:inject',
        draft: {
          text: '',
          images: [{ data: b64, mimeType: 'image/png', name: 'test.png' }],
        },
      },
      'https://x.com',
    )
  }, pngBase64)

  await page.waitForFunction(() => (window as any).__injectedFiles !== undefined, { timeout: 5_000 })
  const fileCount = await page.evaluate(() => (window as any).__injectedFiles)
  expect(fileCount).toBe(1)

  await context.close()
})
