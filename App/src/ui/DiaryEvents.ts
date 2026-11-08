/** Tiny event bus so screens reload when the diary changes outside their control (e.g. background sync). */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes to diary changes; returns an unsubscribe function. */
export function subscribeDiaryChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDiaryChanged(): void {
  listeners.forEach((listener) => listener());
}
