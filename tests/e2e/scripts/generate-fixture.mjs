/**
 * 録画 JSON から fixture HTML を生成する
 * recording-server.mjs から自動的に呼び出される
 */
import { fileURLToPath } from 'url'
import * as path from 'path'
import * as fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, '../fixtures')

const recordingPath = process.argv[2]
if (!recordingPath) {
  console.error('Usage: node generate-fixture.mjs <path-to-recording.json>')
  process.exit(1)
}

const recording = JSON.parse(fs.readFileSync(recordingPath, 'utf-8'))
const { initial, after_text_injection, after_image_injection } = recording

if (!initial) {
  console.error('❌ Invalid recording: missing initial HTML')
  process.exit(1)
}

const fixtureHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>X Compose (recorded fixture)</title>
</head>
<body>
  ${initial}
  <script>
    ;(function () {
      const AFTER_TEXT  = ${JSON.stringify(after_text_injection ?? '')}
      const AFTER_IMAGE = ${JSON.stringify(after_image_injection ?? '')}

      function findContainer(from) {
        let el = from
        for (let i = 0; i < 15; i++) {
          const p = el && el.parentElement
          if (!p || p === document.body) return el
          el = p
          if (el.querySelector('[data-testid="fileInput"], input[type="file"]')) return el
        }
        return el
      }

      function applyState(html, fromEl) {
        if (!html) return
        const container = findContainer(fromEl)
        if (!container) return
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        container.replaceWith(tmp.firstElementChild)
      }

      const textarea  = document.querySelector('[data-testid="tweetTextarea_0"]')
      const fileInput = document.querySelector('[data-testid="fileInput"]') ||
                        document.querySelector('input[type="file"]')

      if (textarea) {
        textarea.addEventListener('paste', function (e) {
          const text = e.clipboardData ? e.clipboardData.getData('text/plain') : ''
          if (!text) return
          applyState(AFTER_TEXT, textarea)
          window.__injectedText = text
        })
      }

      if (fileInput) {
        fileInput.addEventListener('change', function () {
          const count = fileInput.files ? fileInput.files.length : 0
          if (!count) return
          applyState(AFTER_IMAGE, fileInput)
          window.__injectedFiles = count
        })
      }
    })()
  </script>
</body>
</html>
`

fs.mkdirSync(fixturesDir, { recursive: true })
fs.writeFileSync(path.join(fixturesDir, 'x-composer.html'), fixtureHtml)
console.log('✓ tests/e2e/fixtures/x-composer.html')
