import { t } from './i18n'
import { langNativeLabel,LANGS } from './langs'

export type ContentLabel = 'sexual' | 'nudity' | 'porn' | 'graphic-media'

export type AutoCloseMode = 'immediate' | 'countdown' | 'manual'

export interface ThreadgateSettings {
  type: 'everybody' | 'nobody' | 'custom'
  allowMention: boolean
  allowFollowing: boolean
  allowFollower: boolean
}

export interface LangOption {
  id: string
  langs: string[]
}

export interface ReactionOption {
  id: string
  threadgate: ThreadgateSettings
  disableEmbeds: boolean
}

export interface LabelOption {
  id: string
  labels: ContentLabel[]
}

export type UiLang = 'ja' | 'en'

export interface Settings {
  autoClose: AutoCloseMode
  startBlank: boolean
  xHidden: boolean
  xAutoOpen: boolean
  xCliffhanger: boolean
  bskyXShare: boolean
  uiLang: UiLang
  langOptions: LangOption[]
  reactionOptions: ReactionOption[]
  labelOptions: LabelOption[]
}

export const DEFAULT_THREADGATE: ThreadgateSettings = {
  type: 'everybody',
  allowMention: false,
  allowFollowing: false,
  allowFollower: false,
}

export function makeDefaultLangOption(langs: string[] = []): LangOption {
  return { id: 'default', langs }
}

export function makeDefaultReactionOption(): ReactionOption {
  return { id: 'default', threadgate: DEFAULT_THREADGATE, disableEmbeds: false }
}

export function makeDefaultLabelOption(): LabelOption {
  return { id: 'default', labels: [] }
}

export const DEFAULT_SETTINGS: Settings = {
  autoClose: 'manual',
  startBlank: false,
  xHidden: false,
  xAutoOpen: true,
  xCliffhanger: false,
  bskyXShare: true,
  uiLang: 'ja',
  langOptions: [makeDefaultLangOption()],
  reactionOptions: [makeDefaultReactionOption()],
  labelOptions: [makeDefaultLabelOption()],
}

export function formatLangOption(opt: LangOption): string {
  return opt.langs.length > 0 ? opt.langs.map(langNativeLabel).join(' / ') : t('noLang')
}

const LABEL_ORDER: ContentLabel[] = ['sexual', 'nudity', 'porn', 'graphic-media']

export function formatReactionOption(opt: ReactionOption): string {
  const tg = opt.threadgate
  const reactionReply: Record<string, string> = {
    everybody: t('replyEverybody'),
    nobody: t('replyNobody'),
  }
  let reply = reactionReply[tg.type]
  if (!reply) {
    const parts: string[] = []
    if (tg.allowMention) parts.push(t('shortMention'))
    if (tg.allowFollowing) parts.push(t('shortFollowing'))
    if (tg.allowFollower) parts.push(t('allowFollower'))
    reply = parts.length > 0 ? parts.join(t('formatSep')) : t('replyNobody')
  }
  return `${reply} / ${t('formatQuoteLabel')}: ${opt.disableEmbeds ? t('formatQuoteDisabled') : t('formatQuoteAllowed')}`
}

export function formatLabelOption(opt: LabelOption): string {
  const labelNames: Record<string, string> = {
    sexual: t('labelSexual'), nudity: t('labelNudity'), porn: t('labelPorn'), 'graphic-media': t('labelGraphicMedia'),
  }
  const sorted = [...opt.labels].sort((a, b) => LABEL_ORDER.indexOf(a) - LABEL_ORDER.indexOf(b))
  return sorted.length > 0 ? sorted.map(l => labelNames[l] ?? l).join(' / ') : t('noLabel')
}

const SUPPORTED_LANGS: string[] = LANGS.map(l => l.code)

export function detectDefaultLangs(): string[] {
  const lang = navigator.language
  if (!lang) return []
  const lower = lang.toLowerCase()
  if (lower.startsWith('zh')) {
    if (lower.includes('tw')) return ['zh-Hant-TW']
    if (lower.includes('hk')) return ['zh-Hant-HK']
    return ['zh-Hans-CN']
  }
  if (SUPPORTED_LANGS.includes(lang)) return [lang]
  const prefix = lang.split('-')[0]
  if (SUPPORTED_LANGS.includes(prefix)) return [prefix]
  const prefixMatch = SUPPORTED_LANGS.find(code => code.startsWith(prefix + '-'))
  if (prefixMatch) return [prefixMatch]
  return []
}

interface LegacyStoredSettings {
  autoClose?: AutoCloseMode | boolean
  clearOnOpen?: boolean
  xEnabled?: boolean
}

function detectUiLang(): UiLang {
  return navigator.language?.startsWith('ja') ? 'ja' : 'en'
}

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get('settings')
  if (!stored.settings) {
    return { ...DEFAULT_SETTINGS, uiLang: detectUiLang(), langOptions: [makeDefaultLangOption(detectDefaultLangs())] }
  }
  const raw = stored.settings as Partial<Settings> & LegacyStoredSettings & { uiLang?: string }

  const autoClose: AutoCloseMode = typeof raw.autoClose === 'boolean'
    ? (raw.autoClose ? 'immediate' : 'manual')
    : (raw.autoClose ?? DEFAULT_SETTINGS.autoClose)

  const startBlank: boolean = raw.startBlank ?? raw.clearOnOpen ?? DEFAULT_SETTINGS.startBlank

  const xHidden: boolean = raw.xHidden ?? (raw.xEnabled !== undefined ? !raw.xEnabled : DEFAULT_SETTINGS.xHidden)

  const uiLang: UiLang = (raw.uiLang === 'ja' || raw.uiLang === 'en') ? raw.uiLang : detectUiLang()

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    autoClose,
    startBlank,
    xHidden,
    uiLang,
    langOptions: raw.langOptions?.length ? raw.langOptions : [makeDefaultLangOption(detectDefaultLangs())],
    reactionOptions: raw.reactionOptions?.length ? raw.reactionOptions : [makeDefaultReactionOption()],
    labelOptions: raw.labelOptions?.length ? raw.labelOptions : [makeDefaultLabelOption()],
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await loadSettings()
  await browser.storage.sync.set({ settings: { ...current, ...patch } })
}
