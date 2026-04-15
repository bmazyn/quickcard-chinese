/**
 * bookReview.ts
 * Utilities for the Book Review untimed study mode.
 *
 * localStorage keys (all scoped per book):
 *   qc_book_review_pool:<bookId>    – string[]           card IDs in review pool
 *   qc_book_review_stats:<bookId>   – BookReviewStats    last/best score
 *   qc_book_review_clears:<bookId>  – number (0–10)      perfect-clear count
 */

import type { QuizCard } from "../types";
import { getAllDecks } from "./decks";
import quizCardsData from "../data/quizCards.json";

export const SESSION_SIZE = 25;

// ── Storage helpers ──────────────────────────────────────────────────────────

const POOL_KEY_PREFIX = "qc_book_review_pool:";

function poolKey(bookId: number): string {
  return POOL_KEY_PREFIX + bookId;
}

/** Return all card IDs currently in the review pool for a book. */
export function getReviewPool(bookId: number): string[] {
  try {
    const stored = localStorage.getItem(poolKey(bookId));
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

/** Add a card ID to the review pool for a book (idempotent). */
export function addToReviewPool(bookId: number, cardId: string): void {
  try {
    const pool = getReviewPool(bookId);
    if (!pool.includes(cardId)) {
      pool.push(cardId);
      localStorage.setItem(poolKey(bookId), JSON.stringify(pool));
    }
  } catch {
    /* ignore storage errors */
  }
}

/** Remove a card ID from the review pool for a book. */
export function removeFromReviewPool(bookId: number, cardId: string): void {
  try {
    const pool = getReviewPool(bookId);
    const next = pool.filter((id) => id !== cardId);
    localStorage.setItem(poolKey(bookId), JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

// ── Card selection ───────────────────────────────────────────────────────────

/** Fisher-Yates shuffle – returns a new array, does not mutate the input. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * All cards eligible for Book Review from a given book.
 *
 * Eligible = kind vocab | sentence | phrase, deckId belongs to a
 * non-match deck in the book. Reverse-tagged cards are included
 * because they behave as standard MCQ cards in the normal study flow.
 */
export function getEligibleCardsForBook(bookId: number): QuizCard[] {
  const allCards = quizCardsData as QuizCard[];
  const bookDeckIds = new Set(
    getAllDecks()
      .filter((d) => d.book === bookId && d.mode !== "match")
      .map((d) => d.deckId)
  );

  return allCards.filter((card) => {
    const isValidKind =
      card.kind === "vocab" ||
      card.kind === "sentence" ||
      card.kind === "phrase";
    return isValidKind && bookDeckIds.has(card.deckId);
  });
}

/**
 * Build a session of up to `size` cards for Book Review.
 *
 * Strategy:
 *   1. Separate eligible cards into pool cards and non-pool cards.
 *   2. If pool.length >= size: randomly pick `size` cards from the pool.
 *   3. Otherwise: include ALL pool cards + fill remaining slots with
 *      randomly selected non-pool cards.
 *   4. Shuffle the combined set so pool cards land in random positions.
 *
 * Graceful fallback: if total eligible cards < size, return all shuffled
 * (no duplicates).
 */
export function buildBookReviewSession(
  bookId: number,
  size: number = SESSION_SIZE
): QuizCard[] {
  const eligible = getEligibleCardsForBook(bookId);
  if (eligible.length === 0) return [];

  const poolIds = new Set(getReviewPool(bookId));
  const poolCards = eligible.filter((c) => poolIds.has(c.id));
  const nonPoolCards = eligible.filter((c) => !poolIds.has(c.id));

  let session: QuizCard[];

  if (eligible.length <= size) {
    // Not enough unique cards – return all shuffled (no duplicates)
    session = shuffle(eligible);
  } else if (poolCards.length >= size) {
    // Pool alone fills the session – pick randomly so it still feels fresh
    session = shuffle(poolCards).slice(0, size);
  } else {
    // Include all pool cards + fill remainder from non-pool, then shuffle
    const remaining = size - poolCards.length;
    const filler = shuffle(nonPoolCards).slice(0, remaining);
    session = shuffle([...poolCards, ...filler]);
  }

  return session;
}

// ── Score & perfect-clear persistence ───────────────────────────────────────

export interface BookReviewStats {
  lastCorrect: number;
  lastTotal: number;
  bestCorrect: number;
  bestTotal: number;
}

const STATS_KEY_PREFIX  = "qc_book_review_stats:";
const CLEARS_KEY_PREFIX = "qc_book_review_clears:";
export const MAX_PERFECT_CLEARS = 10;

/** Read stored score stats for a book, or null if never played. */
export function getBookReviewStats(bookId: number): BookReviewStats | null {
  try {
    const stored = localStorage.getItem(STATS_KEY_PREFIX + bookId);
    return stored ? (JSON.parse(stored) as BookReviewStats) : null;
  } catch {
    return null;
  }
}

/** Read the number of perfect clears for a book (0–10). */
export function getPerfectClears(bookId: number): number {
  try {
    const stored = localStorage.getItem(CLEARS_KEY_PREFIX + bookId);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist a completed session result for a book.
 * – Always updates last score.
 * – Updates best score only when the new percentage is strictly higher.
 * – Awards one perfect-clear check when correct === total (capped at MAX_PERFECT_CLEARS).
 * Returns the final saved stats and clears count.
 */
export function saveBookReviewResult(
  bookId: number,
  correct: number,
  total: number
): { stats: BookReviewStats; clears: number } {
  const existing = getBookReviewStats(bookId);
  const existingClears = getPerfectClears(bookId);

  const newPct  = total > 0 ? correct / total : 0;
  const bestPct = existing && existing.bestTotal > 0
    ? existing.bestCorrect / existing.bestTotal
    : -1;

  const stats: BookReviewStats = {
    lastCorrect: correct,
    lastTotal:   total,
    bestCorrect: newPct > bestPct ? correct : (existing?.bestCorrect ?? correct),
    bestTotal:   newPct > bestPct ? total   : (existing?.bestTotal   ?? total),
  };

  const isPerfect = correct === total && total > 0;
  const clears = isPerfect
    ? Math.min(existingClears + 1, MAX_PERFECT_CLEARS)
    : existingClears;

  try {
    localStorage.setItem(STATS_KEY_PREFIX  + bookId, JSON.stringify(stats));
    localStorage.setItem(CLEARS_KEY_PREFIX + bookId, clears.toString());
  } catch {
    /* ignore storage errors */
  }

  return { stats, clears };
}
