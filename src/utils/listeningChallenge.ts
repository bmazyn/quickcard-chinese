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
 * Get valid listening challenge cards from a list of chapters
 */
function getValidCardsForChapters(chapters: number[]): QuizCard[] {
  const allCards = quizCardsData as QuizCard[];
  
  // Get all deck IDs from the specified chapters
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
 * Select up to 25 cards for the listening challenge from the current chapter only.
 * Returns empty array if chapter has no valid cards.
 */
export function selectListeningChallengeCards(currentChapter: number): QuizCard[] {
  // Get valid cards from current chapter only
  const pool = getValidCardsForChapters([currentChapter]);
  
  // If no valid cards, return empty array
  if (pool.length === 0) {
    return [];
  }
  
  // Shuffle using Fisher-Yates
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Take first 25 cards (or all if less than 25)
  return shuffled.slice(0, 25);
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
 */
export function saveListeningChallengeResult(
  chapter: number,
  result: ListeningChallengeResult
): boolean {
  try {
    const key = `qc_listening_challenge:${chapter}`;
    const existing = getChapterListeningBest(chapter);
    
    // Save if no existing result or new result is better
    if (!existing || result.correct > existing.correct) {
      localStorage.setItem(key, JSON.stringify(result));
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}
