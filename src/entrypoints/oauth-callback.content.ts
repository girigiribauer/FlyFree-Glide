// WXT がこのファイルを content script として登録することで、OAuth コールバックページが
// chrome.tabs.query({ url: CALLBACK_URL_PATTERN }) でヒットするようになる。
// session.ts の checkOAuthCallback がそのタブの URL を読んで認証を完了させる。
export default defineContentScript({
  matches: ['https://girigiribauer.github.io/FlyFree-Glide/oauth/callback*'],
  runAt: 'document_start',
  main() {},
})
