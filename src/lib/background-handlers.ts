export async function handleGetXPending(sendResponse: (r: { pending: unknown }) => void): Promise<void> {
  const stored = await browser.storage.session.get('xPending')
  const pending = stored.xPending ?? null
  void browser.storage.session.remove('xPending')
  sendResponse({ pending })
}
