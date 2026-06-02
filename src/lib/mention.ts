export interface MentionCandidate {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

// カーソル位置の手前に @mention パターンがあるか判定する
export function parseMention(text: string, cursor: number): { query: string } | null {
  const before = text.slice(0, cursor)
  const match = before.match(/(^|[\s\n])@([a-zA-Z0-9.-]*)$/)
  return match ? { query: match[2] } : null
}

// @mention をハンドルで置換したテキストと新カーソル位置を返す
export function computeInsert(
  text: string,
  cursor: number,
  handle: string,
): { newText: string; newCursor: number } | null {
  const before = text.slice(0, cursor)
  const after = text.slice(cursor)
  const match = before.match(/([\s\S]*(?:^|[\s\n]))@[a-zA-Z0-9.-]*$/)
  if (!match) return null
  const prefix = match[1]
  const newText = prefix + '@' + handle + ' ' + after
  const newCursor = prefix.length + 1 + handle.length + 1
  return { newText, newCursor }
}
