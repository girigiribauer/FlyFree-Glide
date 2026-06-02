type Lang = 'ja' | 'en'

const messages = {
  ja: {
    // AuthModal
    loginTitle: 'ログイン',
    bskyAccountName: 'Bluesky アカウント名',
    pdsToggleAriaLabel: 'PDS設定を開く',
    pdsChange: 'PDS の変更',
    bskyAuthWillOpen: 'Bluesky の認証画面が開きます。',
    authorizing: '認証中...',
    bskyLogin: 'Bluesky でログイン',
    bskyAuthInProgress: 'Bluesky の認証画面で操作してください',
    // CompleteScreen
    posted: '投稿しました！',
    openPostScreen: '投稿画面を開く',
    autoCloseCountdown: '{{count}}秒後にこのウィンドウを自動で閉じます',
    // UserMenu
    accountMenuAriaLabel: 'アカウントメニュー',
    switchAccount: 'アカウントの切り替え',
    addAccount: '別のアカウントを追加',
    logout: 'ログアウト',
    // ComposeScreen
    composePlaceholder: '今なにしてる？',
    linkCardFetching: 'リンクカードを取得中...',
    linkCardFailed: 'リンクカードを取得できませんでした',
    dismissLinkCard: 'リンクカードを削除',
    chipLang: '言語',
    chipReaction: '返信・引用',
    chipLabel: 'コンテンツラベル',
    cliffhangerOn: 'チラ見せモードON',
    cliffhangerOff: 'チラ見せモードOFF',
    uploadingImages: '画像をアップロードしています...',
    close: '閉じる',
    addImage: '画像を追加',
    addEmoji: '絵文字を追加',
    advancedSettings: '詳細設定',
    searching: '検索中...',
    noCandidates: '候補が見つかりません',
    postButton: 'Bluesky に投稿',
    posting: '投稿しています...',
    // OptionsApp
    sectionGeneral: '全般',
    postBehavior: '投稿後の動作',
    closeImmediately: 'すぐ閉じる',
    closeAfterCountdown: '10秒後に閉じる',
    keepOpen: '閉じない',
    startBlank: '空白で開く',
    startBlankDesc: 'デフォルトは開いているページのタイトルと URL を自動入力します',
    xHiddenLabel: 'X に蓋をする',
    xHiddenDesc: 'アイコンやカウンターなど、X に関連するすべての表示が画面に出なくなります',
    bskyShareToX: 'Xにも投稿',
    bskyXShareLabel: '「Xにも投稿」を追加',
    bskyXShareDesc: '公式クライアントの共有メニューに「Xにも投稿」を追加します',
    xAutoOpenLabel: '投稿後に X の投稿画面を自動で開く',
    xAutoOpenDesc: 'Bluesky への投稿完了後、X の投稿画面を自動で開きます',
    xCliffhangerLabel: 'チラ見せモード',
    xCliffhangerDesc: '途中で投稿をぶった斬りつつ、Bluesky の元投稿にリンクして移行を煽るモードです',
    sectionLang: '言語',
    deleteButton: '削除',
    addButton: '+ 追加',
    sectionReaction: '投稿リアクション',
    reply: '返信',
    replyEverybody: '誰でも',
    replyCustom: 'カスタム',
    replyNobody: '不可',
    allowMention: 'メンションしたユーザー',
    allowFollowing: 'フォロー中のユーザー',
    allowFollower: 'フォロワー',
    quote: '引用',
    sectionLabel: '画像ラベリング',
    adultContent: '成人向けコンテンツ',
    labelSexualFull: 'きわどい',
    labelNudityFull: 'ヌード',
    labelPornFull: '成人向け（ポルノ等）',
    labelNone: 'なし',
    labelOther: 'その他',
    labelGraphicMediaFull: '生々しいメディア（グロ・事故・戦争・災害等）',
    uiLangLabel: '表示言語',
    sectionLinks: 'リンク',
    githubRepository: 'GitHub リポジトリ',
    // format functions (compact summary labels)
    noLang: '言語指定なし',
    noLabel: 'ラベルなし',
    shortMention: 'メンション',
    shortFollowing: 'フォロー',
    labelSexual: 'きわどい',
    labelNudity: 'ヌード',
    labelPorn: '成人向け',
    labelGraphicMedia: '生々しいメディア',
    formatQuoteLabel: '引用',
    formatQuoteAllowed: '可',
    formatQuoteDisabled: '不可',
    formatSep: '・',
  },
  en: {
    // AuthModal
    loginTitle: 'Login',
    bskyAccountName: 'Bluesky account name',
    pdsToggleAriaLabel: 'Open PDS settings',
    pdsChange: 'Change PDS',
    bskyAuthWillOpen: 'The Bluesky authorization page will open.',
    authorizing: 'Authorizing...',
    bskyLogin: 'Log in with Bluesky',
    bskyAuthInProgress: 'Please complete authorization on Bluesky',
    // CompleteScreen
    posted: 'Posted!',
    openPostScreen: 'Post on X',
    autoCloseCountdown: 'This window will close in {{count}} seconds',
    // UserMenu
    accountMenuAriaLabel: 'Account menu',
    switchAccount: 'Switch account',
    addAccount: 'Add another account',
    logout: 'Log out',
    // ComposeScreen
    composePlaceholder: "What's on your mind?",
    linkCardFetching: 'Fetching link card...',
    linkCardFailed: 'Failed to fetch link card',
    dismissLinkCard: 'Dismiss link card',
    chipLang: 'Language',
    chipReaction: 'Reply / Quote',
    chipLabel: 'Content label',
    cliffhangerOn: 'Cliffhanger ON',
    cliffhangerOff: 'Cliffhanger OFF',
    uploadingImages: 'Uploading images...',
    close: 'Close',
    addImage: 'Add image',
    addEmoji: 'Add emoji',
    advancedSettings: 'Options',
    searching: 'Searching...',
    noCandidates: 'No results found',
    postButton: 'Post to Bluesky',
    posting: 'Posting...',
    // OptionsApp
    sectionGeneral: 'General',
    postBehavior: 'After posting',
    closeImmediately: 'Close immediately',
    closeAfterCountdown: 'Close after 10 seconds',
    keepOpen: 'Keep open',
    startBlank: 'Start blank',
    startBlankDesc: 'By default, the title and URL of the current page are pre-filled.',
    xHiddenLabel: 'Hide X',
    xHiddenDesc: 'Hides all X-related elements (icons, counters, etc.) from the page.',
    bskyShareToX: 'Post to X',
    bskyXShareLabel: 'Add "Post to X" button',
    bskyXShareDesc: 'Adds a "Post to X" option to the Bluesky share menu.',
    xAutoOpenLabel: 'Auto-open X post screen after posting',
    xAutoOpenDesc: 'Automatically opens the X post screen after a successful Bluesky post.',
    xCliffhangerLabel: 'Cliffhanger mode',
    xCliffhangerDesc: 'Cuts off the post mid-way and links back to the original Bluesky post to nudge migration.',
    sectionLang: 'Language',
    deleteButton: 'Delete',
    addButton: '+ Add',
    sectionReaction: 'Post reactions',
    reply: 'Reply',
    replyEverybody: 'Everybody',
    replyCustom: 'Custom',
    replyNobody: 'Nobody',
    allowMention: 'Users you mentioned',
    allowFollowing: 'Users you follow',
    allowFollower: 'Followers',
    quote: 'Quote',
    sectionLabel: 'Image labeling',
    adultContent: 'Adult content',
    labelSexualFull: 'Suggestive',
    labelNudityFull: 'Nudity',
    labelPornFull: 'Adult (porn, etc.)',
    labelNone: 'None',
    labelOther: 'Other',
    labelGraphicMediaFull: 'Graphic media (gore, accidents, war, disasters, etc.)',
    uiLangLabel: 'Display language',
    sectionLinks: 'Links',
    githubRepository: 'GitHub repository',
    // format functions (compact summary labels)
    noLang: 'No language',
    noLabel: 'No label',
    shortMention: 'Mention',
    shortFollowing: 'Following',
    labelSexual: 'Suggestive',
    labelNudity: 'Nudity',
    labelPorn: 'Adult',
    labelGraphicMedia: 'Graphic media',
    formatQuoteLabel: 'Quote',
    formatQuoteAllowed: 'Allowed',
    formatQuoteDisabled: 'Disabled',
    formatSep: ', ',
  },
} as const

type MessageKey = keyof typeof messages['ja']

let forcedLang: Lang | null = null

export function setLang(lang: Lang): void {
  forcedLang = lang
}

export function resetLang(): void {
  forcedLang = null
}

export function getLang(): Lang {
  if (forcedLang) return forcedLang
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language?.startsWith('ja') ? 'ja' : 'en'
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let msg: string = messages[getLang()][key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(`{{${k}}}`, String(v))
    }
  }
  return msg
}
