/**
 * Persistent progress store for Sentence Set cards.
 * Reads from / writes to localStorage under the key "sentenceSetProgress".
 * Falls back gracefully if localStorage is unavailable or data is corrupt.
 *
 * Progress levels:
 *   0 = no levels cleared
 *   1 = Level 1 cleared
 *   2 = Levels 1 & 2 cleared
 *   3 = all three levels cleared (complete)
 */

type Progress = 0 | 1 | 2 | 3;

const LS_KEY = "sentenceSetProgress";

function loadStore(): Record<string, Progress> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Progress>;
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, Progress>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // ignore write errors (e.g. private browsing quota)
  }
}

// Loaded once at module init; mutations are written back immediately.
const store: Record<string, Progress> = loadStore();

export function getCardProgress(id: string): Progress {
  return store[id] ?? 0;
}

/** Only advances progress — never goes backwards. */
export function advanceCardProgress(id: string, level: 1 | 2 | 3): void {
  const current = getCardProgress(id);
  if (level > current) {
    store[id] = level as Progress;
    saveStore(store);
  }
}

/**
 * Returns the rounded percent complete (0–100) for a collection of card ids.
 * Total possible = ids.length * 3 (three levels per card).
 */
export function setPercentComplete(ids: string[]): number {
  if (ids.length === 0) return 0;
  const total = ids.length * 3;
  const current = ids.reduce((sum, id) => sum + getCardProgress(id), 0);
  return Math.round((current / total) * 100);
}
