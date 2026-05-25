/**
 * @atproto/oauth-client-browser は responseMode のデフォルトが "fragment" のため、
 * OAuth callback の code と state が URL の hash (#) に入る。query string (?) ではない。
 * https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser
 */
export function extractCallbackParams(url: URL): URLSearchParams | null {
  const p = url.hash
    ? new URLSearchParams(url.hash.slice(1))
    : url.searchParams
  if (!p.get('code') || !p.get('state')) return null
  return p
}
