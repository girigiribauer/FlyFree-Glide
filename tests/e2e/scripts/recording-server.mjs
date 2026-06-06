/**
 * 記録モード用ローカル HTTP サーバー
 *
 * POST /save  — recording JSON を受け取り fixtures/ に書き込む
 *              書き込み後、generate-fixture.mjs を自動実行する
 */
import { createServer } from 'http'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const PORT = 7331
const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, '../fixtures')
const recordingPath = resolve(fixturesDir, 'x-composer.recording.json')
const generateScript = resolve(__dirname, 'generate-fixture.mjs')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
}

const server = createServer((req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/save') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        mkdirSync(fixturesDir, { recursive: true })
        writeFileSync(recordingPath, JSON.stringify(data, null, 2))
        console.log(`\n✓ Saved: ${recordingPath}`)

        execFileSync('node', [generateScript, recordingPath], { stdio: 'inherit' })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        console.error('❌ Failed:', e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(e) }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`[REC] Recording server ready on http://localhost:${PORT}`)
  console.log('[REC] Waiting for x-composer data...\n')
})
