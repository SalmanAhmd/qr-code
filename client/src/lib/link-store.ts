import { fetchRecentLinks, type LinkRecord } from './api'

export interface LinkState {
  links: LinkRecord[]
  error: string | null
  loading: boolean
}

let state: LinkState = { links: [], error: null, loading: false }
let inFlight: Promise<void> | null = null

const listeners = new Set<() => void>()

function update(patch: Partial<LinkState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

/** Subscribes to link store updates. Used together with `useSyncExternalStore`. */
export function subscribeToLinks(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Returns the current store snapshot. The reference stays stable between updates. */
export function getLinkState(): LinkState {
  return state
}

/** Resets the store. Used by tests to isolate scenarios. */
export function resetLinkStore(): void {
  state = { links: [], error: null, loading: false }
  inFlight = null
  for (const listener of listeners) listener()
}

/** Loads the persisted short links from the server (de-duplicated while in flight). */
export function refreshLinks(): Promise<void> {
  if (inFlight) return inFlight

  update({ loading: true })

  inFlight = (async () => {
    try {
      const links = await fetchRecentLinks(25)
      update({ links, error: null, loading: false })
    } catch {
      update({
        error: 'Could not load the server history. Is the LinkCraft API running?',
        loading: false,
      })
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
