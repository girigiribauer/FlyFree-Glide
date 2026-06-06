import { defineConfig } from 'wxt'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [solidPlugin()],
  }),
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (manifest.options_ui) manifest.options_ui.open_in_tab = true
      if (process.env.VITE_FIXTURE_UPDATE === '1') {
        manifest.name = 'FlyFree Glide [FXT]'
        const hp = (manifest.host_permissions as string[] | undefined) ?? []
        manifest.host_permissions = [...hp, 'http://localhost:7331/*']
      }
      else if (wxt.config.command === 'serve') manifest.name = 'FlyFree Glide [DEV]'
    },
  },
  dev: {
    server: { port: 1234 },
  },
  runner: {
    disabled: true,
  },
  manifest: {
    name: '__MSG_name__',
    description: '__MSG_description__',
    default_locale: 'en',
    icons: { 128: 'icons/icon.png' },
    action: {
      default_title: '__MSG_default_title__',
      default_icon: { 128: 'icons/icon.png' },
    },
    browser_specific_settings: {
      gecko: {
        id: 'flyfree-glide@girigiribauer.github.io',
        strict_min_version: '109.0',
      },
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
