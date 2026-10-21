export const HISTORY_CHANGED_EVENT = 'linkcraft:history-changed'
export const LINKS_CHANGED_EVENT = 'linkcraft:links-changed'

/** Emits a DOM event that other parts of the app can listen to. */
export function emitEvent(name: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(name))
}
