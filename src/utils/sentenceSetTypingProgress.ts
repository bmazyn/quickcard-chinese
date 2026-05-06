/**
 * Persistent progress store for Sentence Set TYPING mode.
 * Separate from sentenceSetProgress (word-bank mode).
 * Progress is binary: 0 = not done, 3 = done (answered correctly at least once).
 * Using 0/3 so ProgressFill renders empty or fully filled.
 */

type TypingProgress = 0 | 3;

const LS_KEY = "sentenceSetTypingProgress";

function loadStore(): Record<string, TypingProgress> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TypingProgress>;
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, TypingProgress>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {}
}

const store: Record<string, TypingProgress> = loadStore();

export function getTypingProgress(id: string): TypingProgress {
  return store[id] ?? 0;
}

/** Marks a card as done. Never goes backwards. */
export function markTypingDone(id: string): void {
  if (store[id] !== 3) {
    store[id] = 3;
    saveStore(store);
  }
}

/** Returns 0–100 percent of cards that are done. */
export function typingPercentComplete(ids: string[]): number {
  if (ids.length === 0) return 0;
  const done = ids.filter((id) => store[id] === 3).length;
  return Math.round((done / ids.length) * 100);
}
