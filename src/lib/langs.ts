export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語 – Japanese' },
  { code: 'ko', label: '한국어 – Korean' },
  { code: 'zh-Hans-CN', label: '简体中文 – Simplified Chinese' },
  { code: 'zh-Hant-TW', label: '繁體中文 – Traditional Chinese' },
  { code: 'zh-Hant-HK', label: '粵文 – Cantonese' },
  { code: 'es', label: 'español – Spanish' },
  { code: 'pt-BR', label: 'português do Brasil – Brazilian Portuguese' },
  { code: 'pt-PT', label: 'português europeu – European Portuguese' },
  { code: 'fr', label: 'français – French' },
  { code: 'de', label: 'Deutsch – German' },
  { code: 'it', label: 'italiano – Italian' },
  { code: 'ru', label: 'русский – Russian' },
  { code: 'uk', label: 'українська – Ukrainian' },
  { code: 'pl', label: 'polski – Polish' },
  { code: 'nl', label: 'Nederlands – Dutch' },
  { code: 'sv', label: 'svenska – Swedish' },
  { code: 'da', label: 'dansk – Danish' },
  { code: 'fi', label: 'suomi – Finnish' },
  { code: 'hu', label: 'magyar – Hungarian' },
  { code: 'ro', label: 'română – Romanian' },
  { code: 'tr', label: 'Türkçe – Turkish' },
  { code: 'el', label: 'Ελληνικά – Greek' },
  { code: 'hi', label: 'हिंदी – Hindi' },
  { code: 'id', label: 'Bahasa Indonesia – Indonesian' },
  { code: 'vi', label: 'Tiếng Việt – Vietnamese' },
  { code: 'th', label: 'ภาษาไทย – Thai' },
  { code: 'km', label: 'ភាសាខ្មែរ – Khmer' },
  { code: 'ne', label: 'नेपाली – Nepali' },
  { code: 'en-GB', label: 'British English' },
  { code: 'ca', label: 'català – Catalan' },
  { code: 'eu', label: 'euskara – Basque' },
  { code: 'gl', label: 'galego – Galician' },
  { code: 'ga', label: 'Gaeilge – Irish' },
  { code: 'cy', label: 'Cymraeg – Welsh' },
  { code: 'gd', label: 'Gàidhlig – Scottish Gaelic' },
  { code: 'an', label: 'aragonés – Aragonese' },
  { code: 'ast', label: 'asturianu – Asturian' },
  { code: 'eo', label: 'Esperanto' },
  { code: 'ia', label: 'Interlingua' },
  { code: 'fy', label: 'Frysk – Western Frisian' },
] as const

export type LangCode = (typeof LANGS)[number]['code']

export function langLabel(code: string): string {
  return LANGS.find(l => l.code === code)?.label ?? code
}

export function langNativeLabel(code: string): string {
  const label = langLabel(code)
  return label.includes(' – ') ? label.split(' – ')[0] : label
}
