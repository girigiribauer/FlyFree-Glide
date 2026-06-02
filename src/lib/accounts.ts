export interface AccountInfo {
  did: string
  handle: string
  avatarUrl?: string
}

export async function getStoredDids(): Promise<string[]> {
  const result = await browser.storage.sync.get('accounts')
  return (result.accounts as string[] | undefined) ?? []
}

export async function addStoredDid(did: string): Promise<void> {
  const dids = await getStoredDids()
  if (dids.includes(did)) return
  await browser.storage.sync.set({ accounts: [...dids, did] })
}

export async function removeStoredDid(did: string): Promise<void> {
  const dids = await getStoredDids()
  await browser.storage.sync.set({ accounts: dids.filter(d => d !== did) })
}
