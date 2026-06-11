# FlyFree Glide

A browser extension for posting to Bluesky while simultaneously crossposting to X (formerly Twitter).

## Features

- Post to Bluesky with OAuth authentication
- Crosspost to X (opens the X compose window automatically)
- Cliffhanger mode: post only the first half of your text to X with a Bluesky link, drawing readers to the full post
- Link card, image upload, mention autocomplete, and emoji picker support
- Multi-account switching

## Development

```bash
npm install

# Dev server (Chrome)
npm run dev

# Dev server (Firefox)
npm run dev:firefox

# Run tests
npm test

# Build
npm run build
```

After building, load `.output/chrome-mv3/` from the Chrome extensions page.

## Tech stack

- [WXT](https://wxt.dev/) — browser extension framework
- [SolidJS](https://www.solidjs.com/) — UI
- [AT Protocol / Bluesky API](https://docs.bsky.app/) — Bluesky integration
- Vitest / @solidjs/testing-library — testing

## Architecture decisions

Non-obvious implementation choices — why X text/image injection works the way it does, how content script worlds are split, and more — are documented in [`docs/adr.md`](docs/adr.md). Recommended reading before touching the injection layer.

---

## Author

[@girigiribauer.com](https://bsky.app/profile/girigiribauer.com) on Bluesky

> [!NOTE]
> Author is learning English now. Please help me learn English together! I would be happy if you could use simple English. Thank you!
