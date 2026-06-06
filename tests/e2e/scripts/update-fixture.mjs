/**
 * 記録モード起動スクリプト
 *
 * recording-server と WXT dev server を同時に起動する。
 * Ctrl+C または WXT 終了時に両プロセスをクリーンアップする。
 */
import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const server = spawn('node', [resolve(__dirname, 'recording-server.mjs')], {
  stdio: 'inherit',
})

const wxt = spawn('npx', ['wxt'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_FIXTURE_UPDATE: '1' },
})

function cleanup() {
  server.kill('SIGTERM')
  wxt.kill('SIGTERM')
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

wxt.on('exit', code => {
  server.kill('SIGTERM')
  process.exit(code ?? 0)
})
