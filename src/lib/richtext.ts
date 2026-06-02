import { RichText } from '@atproto/api'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export type FacetKind = 'tag' | 'link' | 'mention'

export interface FacetSpan {
  kind: FacetKind
  text: string
}

export type Segment = string | FacetSpan

/** テキストを解析してセグメント列に分解する（純粋関数・テスト可能） */
export function parseSegments(text: string): Segment[] {
  const rt = new RichText({ text })
  rt.detectFacetsWithoutResolution()

  const segments: Segment[] = []
  for (const seg of rt.segments()) {
    if (seg.isTag()) {
      segments.push({ kind: 'tag', text: seg.text })
    } else if (seg.isLink()) {
      segments.push({ kind: 'link', text: seg.text })
    } else if (seg.isMention()) {
      segments.push({ kind: 'mention', text: seg.text })
    } else {
      segments.push(seg.text)
    }
  }
  return segments
}

/**
 * mirror div に渡す HTML 文字列を生成する。
 * cssClasses でファセット種別ごとのクラス名を指定する。
 */
export function buildMirrorHtml(
  text: string,
  cssClasses: Partial<Record<FacetKind, string>>,
): string {
  const segments = parseSegments(text)

  let html = ''
  for (const seg of segments) {
    if (typeof seg === 'string') {
      html += escapeHtml(seg)
    } else {
      const cls = cssClasses[seg.kind]
      const escaped = escapeHtml(seg.text)
      html += cls ? `<span class="${cls}">${escaped}</span>` : escaped
    }
  }

  // textarea と mirror の末尾改行を揃える
  return html.endsWith('\n') ? html + ' ' : html
}
