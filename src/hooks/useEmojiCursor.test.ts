import { describe, expect, test } from 'vitest'

import { useEmojiCursor } from './useEmojiCursor'

describe('useEmojiCursor — applyEmoji', () => {
  test('カーソル位置に絵文字が挿入される', () => {
    let currentText = 'hello world'
    const mockEl = { selectionStart: 5, selectionEnd: 5 } as HTMLTextAreaElement
    const { saveSelection, applyEmoji } = useEmojiCursor(() => mockEl, () => currentText)
    saveSelection()
    currentText = applyEmoji('😊')
    expect(currentText).toBe('hello😊 world')
  })

  test('複数の絵文字を続けて挿入できる', () => {
    let currentText = 'hi'
    const mockEl = { selectionStart: 2, selectionEnd: 2 } as HTMLTextAreaElement
    const { saveSelection, applyEmoji } = useEmojiCursor(() => mockEl, () => currentText)
    saveSelection()
    currentText = applyEmoji('😊')
    currentText = applyEmoji('🎉')
    expect(currentText).toBe('hi😊🎉')
  })

  test('選択範囲を置換して絵文字を挿入する', () => {
    let currentText = 'hello world'
    const mockEl = { selectionStart: 0, selectionEnd: 5 } as HTMLTextAreaElement
    const { saveSelection, applyEmoji } = useEmojiCursor(() => mockEl, () => currentText)
    saveSelection()
    currentText = applyEmoji('👋')
    expect(currentText).toBe('👋 world')
  })

  test('テキストが空のときにも絵文字を挿入できる', () => {
    let currentText = ''
    const mockEl = { selectionStart: 0, selectionEnd: 0 } as HTMLTextAreaElement
    const { saveSelection, applyEmoji } = useEmojiCursor(() => mockEl, () => currentText)
    saveSelection()
    currentText = applyEmoji('🌸')
    expect(currentText).toBe('🌸')
  })
})
