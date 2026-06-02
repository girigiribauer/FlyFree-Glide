import { fireEvent, render, screen } from '@solidjs/testing-library'
import { describe, expect, test, vi } from 'vitest'

import { LANGS } from '../lib/langs'
import LangSelect from './LangSelect'

function renderSelect(value: string[], onChange = vi.fn()) {
  return render(() => <LangSelect value={value} onChange={onChange} />)
}

describe('LangSelect — チップ', () => {
  test('選択中の言語がチップとして表示される', () => {
    renderSelect(['ja', 'en'])
    expect(screen.getByText('日本語')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('× でチップを削除すると onChange が呼ばれる', () => {
    const onChange = vi.fn()
    renderSelect(['ja', 'en'], onChange)
    // 先頭チップ ('ja') の × を押す
    fireEvent.click(screen.getAllByText('×')[0])
    expect(onChange).toHaveBeenCalledWith(['en'])
  })
})

describe('LangSelect — ドロップダウン', () => {
  test('「+ 追加」クリックでドロップダウンが開く', () => {
    renderSelect(['ja'])
    fireEvent.click(screen.getByText('+ 追加'))
    // 'ja' 以外の言語が表示される
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('ドロップダウンに既選択の言語は含まれない', () => {
    renderSelect(['ja'])
    fireEvent.click(screen.getByText('+ 追加'))
    // 'ja' のフルラベルはドロップダウンに出ない
    expect(screen.queryByText('日本語 – Japanese')).not.toBeInTheDocument()
    // 他の言語は出る
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  test('ドロップダウンから言語を選択すると onChange が呼ばれてドロップダウンが閉じる', () => {
    const onChange = vi.fn()
    renderSelect(['ja'], onChange)
    fireEvent.click(screen.getByText('+ 追加'))
    fireEvent.click(screen.getByText('English'))
    expect(onChange).toHaveBeenCalledWith(['ja', 'en'])
    // ドロップダウンが閉じる
    expect(screen.queryByText('日本語 – Japanese')).not.toBeInTheDocument()
  })

  test('全言語選択済みなら「+ 追加」ボタンが表示されない', () => {
    const allCodes = LANGS.map(l => l.code)
    renderSelect([...allCodes])
    expect(screen.queryByText('+ 追加')).not.toBeInTheDocument()
  })
})
