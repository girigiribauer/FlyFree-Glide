import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DEFAULT_SETTINGS,
  DEFAULT_THREADGATE,
  detectDefaultLangs,
  formatLabelOption,
  formatLangOption,
  formatReactionOption,
  loadSettings,
  saveSettings,
} from './settings'

describe('detectDefaultLangs', () => {
  test('ja → ["ja"]', () => {
    vi.stubGlobal('navigator', { language: 'ja' })
    expect(detectDefaultLangs()).toEqual(['ja'])
  })

  test('ja-JP → ["ja"]', () => {
    vi.stubGlobal('navigator', { language: 'ja-JP' })
    expect(detectDefaultLangs()).toEqual(['ja'])
  })

  test('en-US → ["en"]', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(detectDefaultLangs()).toEqual(['en'])
  })

  test('en-GB → ["en-GB"]', () => {
    vi.stubGlobal('navigator', { language: 'en-GB' })
    expect(detectDefaultLangs()).toEqual(['en-GB'])
  })

  test('zh-TW → ["zh-Hant-TW"]', () => {
    vi.stubGlobal('navigator', { language: 'zh-TW' })
    expect(detectDefaultLangs()).toEqual(['zh-Hant-TW'])
  })

  test('zh-HK → ["zh-Hant-HK"]', () => {
    vi.stubGlobal('navigator', { language: 'zh-HK' })
    expect(detectDefaultLangs()).toEqual(['zh-Hant-HK'])
  })

  test('zh-CN → ["zh-Hans-CN"]', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    expect(detectDefaultLangs()).toEqual(['zh-Hans-CN'])
  })

  test('pt → ["pt-BR"]（リスト内で pt- で始まる最初のコードにフォールバック）', () => {
    vi.stubGlobal('navigator', { language: 'pt' })
    expect(detectDefaultLangs()).toEqual(['pt-BR'])
  })

  test('未対応言語 → []', () => {
    vi.stubGlobal('navigator', { language: 'xx-XX' })
    expect(detectDefaultLangs()).toEqual([])
  })
})

describe('loadSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'en' })
  })

  test('未設定時はブラウザ言語をプリセットの langs に使う', async () => {
    vi.stubGlobal('navigator', { language: 'ja' })
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
    const settings = await loadSettings()
    expect(settings.langOptions[0].langs).toEqual(['ja'])
    expect(settings.autoClose).toBe(DEFAULT_SETTINGS.autoClose)
  })

  test('未対応言語のとき langs が空になる', async () => {
    vi.stubGlobal('navigator', { language: 'xx-XX' })
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({})
    const settings = await loadSettings()
    expect(settings.langOptions[0].langs).toEqual([])
  })

  test('保存済み設定をデフォルト値とマージして返す', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { autoClose: 'manual' },
    })
    const settings = await loadSettings()
    expect(settings.autoClose).toBe('manual')
    expect(settings.xAutoOpen).toBe(true)
  })

  test('古い boolean の autoClose: true を immediate に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { autoClose: true },
    })
    const settings = await loadSettings()
    expect(settings.autoClose).toBe('immediate')
  })

  test('古い boolean の autoClose: false を manual に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { autoClose: false },
    })
    const settings = await loadSettings()
    expect(settings.autoClose).toBe('manual')
  })

  test('古い clearOnOpen: true を startBlank: true に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { clearOnOpen: true },
    })
    const settings = await loadSettings()
    expect(settings.startBlank).toBe(true)
  })

  test('古い clearOnOpen: false を startBlank: false に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { clearOnOpen: false },
    })
    const settings = await loadSettings()
    expect(settings.startBlank).toBe(false)
  })

  test('autoClose: countdown がそのまま保持される', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { autoClose: 'countdown' },
    })
    const settings = await loadSettings()
    expect(settings.autoClose).toBe('countdown')
  })

  test('古い xEnabled: false を xHidden: true に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { xEnabled: false },
    })
    const settings = await loadSettings()
    expect(settings.xHidden).toBe(true)
  })

  test('古い xEnabled: true を xHidden: false に移行する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { xEnabled: true },
    })
    const settings = await loadSettings()
    expect(settings.xHidden).toBe(false)
  })

  test('reactionOptions が空配列のときデフォルトにフォールバック', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { reactionOptions: [] },
    })
    const settings = await loadSettings()
    expect(settings.reactionOptions).toHaveLength(1)
    expect(settings.reactionOptions[0].threadgate.type).toBe('everybody')
  })

  test('labelOptions が空配列のときデフォルトにフォールバック', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { labelOptions: [] },
    })
    const settings = await loadSettings()
    expect(settings.labelOptions).toHaveLength(1)
    expect(settings.labelOptions[0].labels).toEqual([])
  })
})

describe('saveSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { language: 'en' })
  })

  test('既存設定とマージして保存する', async () => {
    ;(browser.storage.sync.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      settings: { autoClose: 'manual' },
    })
    ;(browser.storage.sync.set as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    await saveSettings({ xAutoOpen: false })
    expect(browser.storage.sync.set).toHaveBeenCalledWith({
      settings: expect.objectContaining({ autoClose: 'manual', xAutoOpen: false }),
    })
  })
})

describe('formatLangOption', () => {
  test('langs が空のとき「言語指定なし」を返す', () => {
    expect(formatLangOption({ id: 'x', langs: [] })).toBe('言語指定なし')
  })

  test('ja → 日本語', () => {
    expect(formatLangOption({ id: 'x', langs: ['ja'] })).toBe('日本語')
  })

  test('en → English', () => {
    expect(formatLangOption({ id: 'x', langs: ['en'] })).toBe('English')
  })

  test('ko → 한국어', () => {
    expect(formatLangOption({ id: 'x', langs: ['ko'] })).toBe('한국어')
  })

  test('複数言語はスラッシュ区切り', () => {
    expect(formatLangOption({ id: 'x', langs: ['ja', 'en'] })).toBe('日本語 / English')
  })

  test('未対応コードはコードをそのまま返す', () => {
    expect(formatLangOption({ id: 'x', langs: ['zzz'] })).toBe('zzz')
  })
})

describe('formatReactionOption', () => {
  test('everybody + 引用可 → デフォルト表示', () => {
    expect(formatReactionOption({ id: 'x', threadgate: DEFAULT_THREADGATE, disableEmbeds: false }))
      .toBe('誰でも / 引用: 可')
  })

  test('everybody + 引用不可', () => {
    expect(formatReactionOption({ id: 'x', threadgate: DEFAULT_THREADGATE, disableEmbeds: true }))
      .toBe('誰でも / 引用: 不可')
  })

  test('nobody', () => {
    expect(formatReactionOption({ id: 'x', threadgate: { type: 'nobody', allowMention: false, allowFollowing: false, allowFollower: false }, disableEmbeds: false }))
      .toBe('不可 / 引用: 可')
  })

  test('custom: allowMention のみ', () => {
    expect(formatReactionOption({ id: 'x', threadgate: { type: 'custom', allowMention: true, allowFollowing: false, allowFollower: false }, disableEmbeds: false }))
      .toBe('メンション / 引用: 可')
  })

  test('custom: 全フラグ on', () => {
    expect(formatReactionOption({ id: 'x', threadgate: { type: 'custom', allowMention: true, allowFollowing: true, allowFollower: true }, disableEmbeds: false }))
      .toBe('メンション・フォロー・フォロワー / 引用: 可')
  })

  test('custom: 全フラグ off → 実質不可', () => {
    expect(formatReactionOption({ id: 'x', threadgate: { type: 'custom', allowMention: false, allowFollowing: false, allowFollower: false }, disableEmbeds: false }))
      .toBe('不可 / 引用: 可')
  })
})

describe('formatLabelOption', () => {
  test('labels が空のとき「ラベルなし」を返す', () => {
    expect(formatLabelOption({ id: 'x', labels: [] })).toBe('ラベルなし')
  })

  test('sexual → きわどい', () => {
    expect(formatLabelOption({ id: 'x', labels: ['sexual'] })).toBe('きわどい')
  })

  test('nudity → ヌード', () => {
    expect(formatLabelOption({ id: 'x', labels: ['nudity'] })).toBe('ヌード')
  })

  test('porn → 成人向け', () => {
    expect(formatLabelOption({ id: 'x', labels: ['porn'] })).toBe('成人向け')
  })

  test('graphic-media → 生々しいメディア', () => {
    expect(formatLabelOption({ id: 'x', labels: ['graphic-media'] })).toBe('生々しいメディア')
  })

  test('複数ラベルはスラッシュ区切り', () => {
    expect(formatLabelOption({ id: 'x', labels: ['sexual', 'graphic-media'] })).toBe('きわどい / 生々しいメディア')
  })

  test('配列の順序に関わらず canonical 順で表示される', () => {
    expect(formatLabelOption({ id: 'x', labels: ['graphic-media', 'sexual'] })).toBe('きわどい / 生々しいメディア')
  })
})
