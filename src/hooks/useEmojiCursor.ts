export function useEmojiCursor(
  getEl: () => HTMLTextAreaElement | undefined,
  getText: () => string,
) {
  let selection = { start: 0, end: 0 }

  function saveSelection() {
    const el = getEl()
    selection = {
      start: el?.selectionStart ?? getText().length,
      end: el?.selectionEnd ?? getText().length,
    }
  }

  function applyEmoji(native: string): string {
    const { start, end } = selection
    const newText = getText().slice(0, start) + native + getText().slice(end)
    const newPos = start + native.length
    selection = { start: newPos, end: newPos }
    return newText
  }

  return { saveSelection, applyEmoji }
}
