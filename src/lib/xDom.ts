// x.com の DOM 構造に依存するセレクタ。UI 変更時はここを直す。
export const X_SEL = {
  modal: '[aria-modal="true"]',
  tweetTextarea: '[data-testid="tweetTextarea_0"]',
  fileInput: '[data-testid="fileInput"]',
  fileInputFallback: 'input[type="file"]',
} as const
