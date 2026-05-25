import { defineConfig } from 'wxt'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [solidPlugin()],
  }),
  dev: {
    server: { port: 1234 },
  },
  runner: {
    disabled: true,
  },
  manifest: {
    name: 'FlyFree Glide',
    description: 'Crosspost to X and Bluesky, with Glide.',
    icons: { 128: 'icons/icon.png' },
    action: {
      default_title: 'FlyFree Glide',
      default_icon: { 128: 'icons/icon.png' },
    },
    permissions: ['storage', 'tabs'],
    host_permissions: [
      'https://x.com/*',
      'https://twitter.com/*',
      'https://girigiribauer.github.io/FlyFree-Glide/oauth/callback*',
      '*://*/*',
    ],
  },
})
