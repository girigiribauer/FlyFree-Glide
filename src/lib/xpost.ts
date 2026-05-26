export const X_COMPOSE_URL = 'https://x.com/compose/post'
export const X_POPUP_WIDTH = 600
export const X_POPUP_HEIGHT = 700

export interface XPendingImage {
  data: string  // base64 encoded — browser.storage.session serializes Uint8Array as {} via JSON
  mimeType: string
  name: string
}

export interface XPending {
  text: string
  images: XPendingImage[]
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function openXCompose(): void {
  void browser.windows.create({ url: X_COMPOSE_URL, type: 'popup', width: X_POPUP_WIDTH, height: X_POPUP_HEIGHT })
}
