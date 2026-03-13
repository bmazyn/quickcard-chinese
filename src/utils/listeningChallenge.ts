import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckEntriesForChapter } from "./decks";

/**
 * Check if a quiz card is valid for the listening challenge
 * (vocab or phrase, no reverse, no pair)
 */
export function isValidListeningCard(card: QuizCard): boolean {
  return (
    (card.kind === "vocab" || card.kind === "phrase") &&
    !card.tags.includes("reverse") &&
    !card.tags.includes("pair") &&
    !card.tags.includes("pairs")
  );
}

/**
 * Check if a chapter has any valid listening challenge cards
 */
export function chapterHasListeningCards(chapter: number): boolean {
  const cards = getValidCardsForChapters([chapter]);
  return cards.length > 0;
}

/**
 * Get valid listening challenge cards from a list of chapters.
 * 
 * Uses the deck registry's chapter metadata as the source of truth.
 * Does NOT rely on deck name patterns or deckId naming conventions.
 * 
 * Process:
 * 1. Get all deck entries where entry.chapter === targetChapter (from registry)
 * 2. Collect all deckIds from those entries
 * 3. Filter quiz cards where card.deckId matches one of those deckIds
 * 4. Apply listening challenge filters (vocab/phrase, no reverse/pair tags)
 */
function getValidCardsForChapters(chapters: number[]): QuizCard[] {
  const allCards = quizCardsData as QuizCard[];
  
  // Get all deck IDs from the specified chapters using the deck registry
  // getDeckEntriesForChapter filters by entry.chapter === chapter (metadata only)
  const deckIds = new Set<string>();
  chapters.forEach(chapter => {
    const entries = getDeckEntriesForChapter(chapter);
    entries.forEach(entry => deckIds.add(entry.deckId));
  });
  
  // Filter cards by deck IDs and validity
  return allCards.filter(card => 
    deckIds.has(card.deckId) && isValidListeningCard(card)
  );
}

/**
 * Check if a card is a phrase card (by kind or tags)
 */
function isPhraseCard(card: QuizCard): boolean {
  return (
    card.kind === "phrase" ||
    card.tags.includes("phrase") ||
    card.tags.includes("phrases")
  );
}

/**
 * Select up to 25 cards for the listening challenge from the current chapter only.
 * Limits phrase cards to a maximum of 4.
 * Returns empty array if chapter has no valid cards.
 */
export function selectListeningChallengeCards(currentChapter: number): QuizCard[] {
  // Get valid cards from current chapter only
  const pool = getValidCardsForChapters([currentChapter]);
  
  // If no valid cards, return empty array
  if (pool.length === 0) {
    return [];
  }
  
  // Separate phrase cards from non-phrase cards
  const phraseCards = pool.filter(card => isPhraseCard(card));
  const nonPhraseCards = pool.filter(card => !isPhraseCard(card));
  
  // Shuffle both groups separately
  const shufflePhraseCards = [...phraseCards];
  for (let i = shufflePhraseCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shufflePhraseCards[i], shufflePhraseCards[j]] = [shufflePhraseCards[j], shufflePhraseCards[i]];
  }
  
  const shuffleNonPhraseCards = [...nonPhraseCards];
  for (let i = shuffleNonPhraseCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleNonPhraseCards[i], shuffleNonPhraseCards[j]] = [shuffleNonPhraseCards[j], shuffleNonPhraseCards[i]];
  }
  
  // Take at most 3 phrase cards and up to 22 non-phrase cards
  const selectedPhraseCards = shufflePhraseCards.slice(0, 3);
  const selectedNonPhraseCards = shuffleNonPhraseCards.slice(0, 22);
  
  // Combine and shuffle the final selection
  const combined = [...selectedPhraseCards, ...selectedNonPhraseCards];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  
  // Take first 25 cards (or all if less than 25)
  return combined.slice(0, 25);
}

/**
 * Result for a listening challenge
 */
export interface ListeningChallengeResult {
  correct: number;
  total: number;
}

/**
 * Get the best listening challenge result for a chapter
 */
export function getChapterListeningBest(chapter: number): ListeningChallengeResult | null {
  try {
    const key = `qc_listening_challenge:${chapter}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save listening challenge result if it's better than the existing best
 * Returns true if the result was saved (is new best)
 * 
 * "Better" means higher correct count.
 * If tied, keeps the existing score (does not save).
 */
export function saveListeningChallengeResult(
  chapter: number,
  result: ListeningChallengeResult
): boolean {
  try {
    const key = `qc_listening_challenge:${chapter}`;
    const existing = getChapterListeningBest(chapter);
    
    // If no existing result, save this one
    if (!existing) {
      localStorage.setItem(key, JSON.stringify(result));
      return true;
    }
    
    // Only save if new score is strictly better (higher correct count)
    // Ensure we're comparing numbers to avoid any type coercion issues
    const newCorrect = Number(result.correct);
    const existingCorrect = Number(existing.correct);
    
    if (newCorrect > existingCorrect) {
      localStorage.setItem(key, JSON.stringify(result));
      return true;
    }
    
    // Otherwise, keep existing best score (don't save)
    return false;
  } catch {
    return false;
  }
}
