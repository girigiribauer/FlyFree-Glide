export default defineContentScript({
  matches: ['https://girigiribauer.github.io/FlyFree-Glide/oauth/callback*'],
  runAt: 'document_start',
  main() {},
})
