import { RichText } from '@atproto/api'

export const X_COMPOSE_URL = 'https://x.com/compose/post'
export const X_POPUP_WIDTH = 600
export const X_POPUP_HEIGHT = 400

const MIN_CLIFFHANGER_GRAPHEMES = 50
const X_CHAR_LIMIT = 280
const X_URL_WEIGHT = 23  // t.co wraps all URLs to exactly 23 chars
const CLIFFHANGER_ELLIPSIS = '... '

function xWeightOf(char: string): number {
  const cp = char.codePointAt(0) ?? 0
  // East Asian Wide characters (Unicode EastAsianWidth = W) count as 2 in X
  if (
    (cp >= 0x1100 && cp <= 0x115F) ||   // Hangul Jamo
    (cp >= 0x2E80 && cp <= 0x303E) ||   // CJK Radicals, Kangxi, CJK Symbols
    (cp >= 0x3041 && cp <= 0x33FF) ||   // Hiragana, Katakana, Bopomofo, CJK Compat
    (cp >= 0x3400 && cp <= 0x4DBF) ||   // CJK Extension A
    (cp >= 0x4E00 && cp <= 0x9FFF) ||   // CJK Unified Ideographs
    (cp >= 0xA960 && cp <= 0xA97F) ||   // Hangul Jamo Extended-A
    (cp >= 0xAC00 && cp <= 0xD7FF) ||   // Hangul Syllables
    (cp >= 0xF900 && cp <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (cp >= 0xFE10 && cp <= 0xFE6F) ||   // Vertical/Small/CJK Compat Forms
    (cp >= 0xFF01 && cp <= 0xFF60) ||   // Fullwidth Latin/Punctuation
    (cp >= 0xFFE0 && cp <= 0xFFE6) ||   // Fullwidth Currency Signs
    (cp >= 0x1B000 && cp <= 0x1B0FF)    // Kana Supplement
  ) return 2
  return 1
}

export function countXChars(text: string): number {
  const rt = new RichText({ text })
  rt.detectFacetsWithoutResolution()

  let count = 0
  for (const seg of rt.segments()) {
    if (seg.isLink() && seg.link) {
      const uri = seg.link.uri
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        count += X_URL_WEIGHT
      } else {
        count += [...seg.text].reduce((sum, ch) => sum + xWeightOf(ch), 0)
      }
    } else {
      count += [...seg.text].reduce((sum, ch) => sum + xWeightOf(ch), 0)
    }
  }
  return count
}

export function composeCliffhangerText(text: string, blueskyUrl: string): string {
  const segmenter = new Intl.Segmenter()
  const graphemes = [...segmenter.segment(text)].map(s => s.segment)
  if (graphemes.length < MIN_CLIFFHANGER_GRAPHEMES) return text + '\n' + blueskyUrl

  const halfPoint = Math.floor(graphemes.length / 2)
  const maxXChars = X_CHAR_LIMIT - CLIFFHANGER_ELLIPSIS.length - X_URL_WEIGHT

  const rt = new RichText({ text })
  rt.detectFacetsWithoutResolution()

  let gi = 0
  let xCount = 0
  let cutAt = 0

  outer:
  for (const seg of rt.segments()) {
    const segGs = [...segmenter.segment(seg.text)].map(s => s.segment)
    const isHttpUrl = seg.isLink() && !!seg.link &&
      (seg.link.uri.startsWith('http://') || seg.link.uri.startsWith('https://'))

    if (isHttpUrl) {
      // URL はアトミックに扱う：halfPoint 以降に始まるなら含めない
      if (gi >= halfPoint) break outer
      if (xCount + X_URL_WEIGHT > maxXChars) break outer
      xCount += X_URL_WEIGHT
      gi += segGs.length
      cutAt = gi
    } else {
      for (const g of segGs) {
        if (gi >= halfPoint) break outer
        const w = [...g].reduce((sum, ch) => sum + xWeightOf(ch), 0)
        if (xCount + w > maxXChars) break outer
        xCount += w
        cutAt = ++gi
      }
    }
  }

  return graphemes.slice(0, cutAt).join('') + CLIFFHANGER_ELLIPSIS + blueskyUrl
}

export interface XDraftImage {
  data: string  // base64 encoded — browser.storage.session serializes Uint8Array as {} via JSON
  mimeType: string
  name: string
}

export interface XDraft {
  text: string
  images: XDraftImage[]
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
