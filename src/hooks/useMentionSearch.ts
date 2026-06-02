import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-browser'
import { createSignal, onCleanup } from 'solid-js'

import type { MentionCandidate } from '../lib/mention'

export type { MentionCandidate }

export function useMentionSearch(session: OAuthSession) {
  const [candidates, setCandidates] = createSignal<MentionCandidate[]>([])
  const [loading, setLoading] = createSignal(false)
  const [index, setIndex] = createSignal(0)
  let debounceId: ReturnType<typeof setTimeout> | undefined

  onCleanup(() => clearTimeout(debounceId))

  function reset() {
    setCandidates([])
    setLoading(false)
    setIndex(0)
  }

  function schedule(query: string) {
    clearTimeout(debounceId)
    debounceId = setTimeout(() => void search(query), 300)
  }

  async function search(query: string) {
    if (!query) { setCandidates([]); return }
    setLoading(true)
    try {
      const agent = new Agent(session)
      const res = await agent.searchActorsTypeahead({ term: query, limit: 5 })
      setCandidates(res.data.actors.map(a => ({
        did: a.did,
        handle: a.handle,
        displayName: a.displayName,
        avatar: a.avatar,
      })))
      setIndex(0)
    } catch {
      setCandidates([])
    } finally {
      setLoading(false)
    }
  }

  return { candidates, loading, index, setIndex, schedule, reset }
}
