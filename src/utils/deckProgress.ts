/**
 * Deck Progress Utilities
 *
 * Shared helpers for reading/writing per-deck best times and completion flags.
 * Uses the same localStorage key prefixes as the rest of the app so that
 * backup/restore utilities pick them up automatically:
 *
 *   qc_deck_speedrun_best:<deckId>   – best elapsed seconds (integer)
 *   quickcard_mastered_sections      – JSON object keyed by deckId/deckName
 */

const BEST_TIME_KEY_PREFIX = "qc_deck_speedrun_best:";
const MASTERED_KEY = "quickcard_mastered_sections";

/**
 * Persist a best time for a deck (only updates when the new time is better).
 * @param deckId  Stable deck identifier (e.g. "ch5-match1")
 * @param seconds Elapsed seconds to record
 */
export function saveBestTime(deckId: string, seconds: number): void {
  try {
    const existing = getBestTime(deckId);
    if (existing === null || seconds < existing) {
      localStorage.setItem(BEST_TIME_KEY_PREFIX + deckId, seconds.toString());
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Read the stored best time for a deck.
 * @param deckId Stable deck identifier
 * @returns Best time in seconds, or null if never completed
 */
export function getBestTime(deckId: string): number | null {
  try {
    const stored = localStorage.getItem(BEST_TIME_KEY_PREFIX + deckId);
    return stored !== null ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Mark a deck as completed (completedOnce = true).
 * Stores the flag inside the shared "quickcard_mastered_sections" map
 * so the deck tile shows the mastery check mark.
 * @param deckId Stable deck identifier
 */
export function markDeckComplete(deckId: string): void {
  try {
    const mastered: Record<string, boolean> = JSON.parse(
      localStorage.getItem(MASTERED_KEY) ?? "{}"
    );
    mastered[deckId] = true;
    localStorage.setItem(MASTERED_KEY, JSON.stringify(mastered));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Check whether a deck has been completed at least once.
 * @param deckId Stable deck identifier
 */
export function isDeckComplete(deckId: string): boolean {
  try {
    const mastered: Record<string, boolean> = JSON.parse(
      localStorage.getItem(MASTERED_KEY) ?? "{}"
    );
    return mastered[deckId] === true;
  } catch {
    return false;
  }
}
