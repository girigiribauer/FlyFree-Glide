import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

export const OAUTH_CALLBACK_URL =
  'https://girigiribauer.github.io/FlyFree-Glide/oauth/callback'

export const DEFAULT_PDS_URL = 'https://bsky.social'

const CLIENT_METADATA = {
  client_id:
    'https://girigiribauer.github.io/FlyFree-Glide/client-metadata.json',
  client_name: 'FlyFree Glide',
  client_uri: 'https://girigiribauer.github.io/FlyFree-Glide',
  redirect_uris: [OAUTH_CALLBACK_URL] as [string],
  scope: 'atproto transition:generic',
  grant_types: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
  response_types: ['code'] as ['code'],
  token_endpoint_auth_method: 'none' as const,
  application_type: 'native' as const,
  dpop_bound_access_tokens: true,
}

let _client: BrowserOAuthClient | undefined
let _handleResolver: string | undefined

export function getOAuthClient(handleResolver = DEFAULT_PDS_URL): BrowserOAuthClient {
  if (!_client || _handleResolver !== handleResolver) {
    _handleResolver = handleResolver
    _client = new BrowserOAuthClient({
      clientMetadata: CLIENT_METADATA,
      handleResolver,
    })
  }
  return _client
}
