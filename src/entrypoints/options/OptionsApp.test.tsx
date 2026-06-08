import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import OptionsApp from './OptionsApp'

function stubReload() {
  const reload = vi.fn()
  vi.stubGlobal('location', { reload, href: 'http://localhost/' })
  return reload
}

function mockSettings(overrides: Record<string, unknown> = {}) {
  ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    settings: overrides,
  })
  ;(browser.storage.sync.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
}

describe('OptionsApp — 初期表示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('設定を読み込んで表示する', async () => {
    mockSettings()
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('X に蓋をする')).toBeInTheDocument())
  })
})

describe('OptionsApp — autoClose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('immediate が選択されているとき「すぐ閉じる」ラジオがチェックされている', async () => {
    mockSettings({ autoClose: 'immediate' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('X に蓋をする')).toBeInTheDocument())
    const radio = screen.getByRole('radio', { name: 'すぐ閉じる' })
    expect(radio).toBeChecked()
  })

  test('countdown が選択されているとき「10秒後に閉じる」ラジオがチェックされている', async () => {
    mockSettings({ autoClose: 'countdown' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('radio', { name: '10秒後に閉じる' })).toBeChecked())
  })

  test('manual が選択されているとき「閉じない」ラジオがチェックされている', async () => {
    mockSettings({ autoClose: 'manual' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('radio', { name: '閉じない' })).toBeChecked())
  })

  test('ラジオを変更すると saveSettings が呼ばれる', async () => {
    mockSettings({ autoClose: 'immediate' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('X に蓋をする')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('radio', { name: '閉じない' }))
    await vi.waitFor(() =>
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ autoClose: 'manual' }),
      })
    )
  })
})

describe('OptionsApp — X に蓋をする', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('xHidden が false のとき X サブ設定が表示される', async () => {
    mockSettings({ xHidden: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('X に蓋をする')).toBeInTheDocument())
    expect(screen.getByText('投稿後に X の投稿画面を自動で開く')).toBeInTheDocument()
    expect(screen.getByText('チラ見せモード')).toBeInTheDocument()
  })

  test('xHidden が true のとき X サブ設定が非表示になる', async () => {
    mockSettings({ xHidden: true })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.queryByText('投稿後に X の投稿画面を自動で開く')).not.toBeInTheDocument())
    expect(screen.queryByText('チラ見せモード')).not.toBeInTheDocument()
  })

  test('「X に蓋をする」をオンにすると xHidden: true が保存される', async () => {
    mockSettings({ xHidden: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('投稿後に X の投稿画面を自動で開く')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('checkbox', { name: 'X に蓋をする' }), { target: { checked: true } })

    await vi.waitFor(() =>
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ xHidden: true }),
      })
    )
  })

  test('「X に蓋をする」をオンにすると X サブ設定が消える', async () => {
    mockSettings({ xHidden: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('投稿後に X の投稿画面を自動で開く')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('checkbox', { name: 'X に蓋をする' }), { target: { checked: true } })

    await vi.waitFor(() =>
      expect(screen.queryByText('投稿後に X の投稿画面を自動で開く')).not.toBeInTheDocument()
    )
  })

  test('「X に蓋をする」をオフにすると X サブ設定が復活する', async () => {
    mockSettings({ xHidden: true })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: 'X に蓋をする' })).toBeInTheDocument())
    expect(screen.queryByText('投稿後に X の投稿画面を自動で開く')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('checkbox', { name: 'X に蓋をする' }), { target: { checked: false } })

    await vi.waitFor(() =>
      expect(screen.getByText('投稿後に X の投稿画面を自動で開く')).toBeInTheDocument()
    )
  })
})

describe('OptionsApp — チラ見せモード', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('xCliffhanger が false のときトグルがオフ', async () => {
    mockSettings({ xCliffhanger: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('チラ見せモード')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'チラ見せモード' })).not.toBeChecked()
  })

  test('xCliffhanger が true のときトグルがオン', async () => {
    mockSettings({ xCliffhanger: true })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: 'チラ見せモード' })).toBeChecked())
  })

  test('トグルをオンにすると xCliffhanger: true が保存される', async () => {
    mockSettings({ xCliffhanger: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('チラ見せモード')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('checkbox', { name: 'チラ見せモード' }), { target: { checked: true } })
    await vi.waitFor(() =>
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ xCliffhanger: true }),
      })
    )
  })

  test('xHidden が true のときチラ見せモードのトグルが非表示', async () => {
    mockSettings({ xHidden: true })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: 'X に蓋をする' })).toBeInTheDocument())
    expect(screen.queryByText('チラ見せモード')).not.toBeInTheDocument()
  })
})

describe('OptionsApp — startBlank', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('startBlank が false のときチェックなし', async () => {
    mockSettings({ startBlank: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('空白で開く')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: '空白で開く' })).not.toBeChecked()
  })

  test('startBlank が true のときチェックあり', async () => {
    mockSettings({ startBlank: true })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByRole('checkbox', { name: '空白で開く' })).toBeChecked())
  })

  test('トグルを変更すると saveSettings が呼ばれる', async () => {
    mockSettings({ startBlank: false })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('空白で開く')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('checkbox', { name: '空白で開く' }), { target: { checked: true } })
    await vi.waitFor(() =>
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ startBlank: true }),
      })
    )
  })
})

describe('OptionsApp — 表示言語', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'ja' })
  })

  test('uiLang が ja のとき「日本語」が選択されている（初期値）', async () => {
    mockSettings({})
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('表示言語')).toBeInTheDocument())
    expect(screen.getByDisplayValue('日本語')).toBeInTheDocument()
  })

  test('uiLang が ja のとき「日本語」が選択されている', async () => {
    mockSettings({ uiLang: 'ja' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('表示言語')).toBeInTheDocument())
    expect(screen.getByDisplayValue('日本語')).toBeInTheDocument()
  })

  test('uiLang が en のとき英語UIで表示され「English」が選択されている', async () => {
    mockSettings({ uiLang: 'en' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('Display language')).toBeInTheDocument())
    expect(screen.getByDisplayValue('English')).toBeInTheDocument()
  })

  test('言語を変更すると saveSettings が呼ばれる', async () => {
    stubReload()
    mockSettings({ uiLang: 'ja' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('表示言語')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('日本語'), { target: { value: 'en' } })
    await vi.waitFor(() =>
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ uiLang: 'en' }),
      })
    )
  })

  test('言語を変更すると location.reload が呼ばれる', async () => {
    const reload = stubReload()
    mockSettings({ uiLang: 'ja' })
    render(() => <OptionsApp />)
    await vi.waitFor(() => expect(screen.getByText('表示言語')).toBeInTheDocument())
    fireEvent.change(screen.getByDisplayValue('日本語'), { target: { value: 'en' } })
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
  })
})
