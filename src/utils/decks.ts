import type { Deck } from "../types";
import decksData from "../data/decks.json";
import { isDeckComplete, getBestTime } from "./deckProgress";

// Type the imported decks data
const decks = decksData as Record<string, Deck>;

/**
 * Get deck metadata by deckId
 */
export function getDeck(deckId: string): Deck | undefined {
  return decks[deckId];
}

/**
 * Get all decks as an array with deckId included
 */
export function getAllDecks(): Array<Deck & { deckId: string }> {
  return Object.entries(decks).map(([deckId, deck]) => ({
    ...deck,
    deckId,
  }));
}

/**
 * Get deckId from deckName (for backward compatibility)
 */
export function getDeckIdByName(deckName: string): string | undefined {
  const entry = Object.entries(decks).find(([_, deck]) => deck.deckName === deckName);
  return entry?.[0];
}

/**
 * Get all sections in order
 */
export function getSections(): string[] {
  const sections = new Set<string>();
  Object.values(decks).forEach(deck => sections.add(deck.section));
  return Array.from(sections);
}

/**
 * Get all deck names for a section
 */
export function getDecksForSection(section: string): string[] {
  return Object.values(decks)
    .filter(deck => deck.section === section)
    .sort((a, b) => a.order - b.order)
    .map(deck => deck.deckName);
}

/**
 * Get full deck entries (including deckId) for a section, sorted by order.
 * Prefer this over getDecksForSection when you need both the id and metadata.
 */
export function getDeckEntriesForSection(section: string): Array<Deck & { deckId: string }> {
  return Object.entries(decks)
    .filter(([_, deck]) => deck.section === section)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([deckId, deck]) => ({ deckId, ...deck }));
}

/**
 * Returns true when the deck identified by deckId uses mode:"match".
 */
export function isMatchDeck(deckId: string): boolean {
  return decks[deckId]?.mode === "match";
}

/**
 * Get deck name from deckId
 */
export function getDeckName(deckId: string): string | undefined {
  return decks[deckId]?.deckName;
}

/**
 * Get section name from deckId
 */
export function getSectionName(deckId: string): string | undefined {
  return decks[deckId]?.section;
}

/**
 * Get sections grouped by chapter
 */
export function getChapterStructure(): Record<number, string[]> {
  const chapterMap: Record<number, Set<string>> = {};
  
  Object.values(decks).forEach(deck => {
    const chapter = deck.chapter;
    if (!chapterMap[chapter]) {
      chapterMap[chapter] = new Set();
    }
    chapterMap[chapter].add(deck.section);
  });
  
  const result: Record<number, string[]> = {};
  Object.entries(chapterMap).forEach(([chapter, sections]) => {
    result[Number(chapter)] = Array.from(sections);
  });
  
  return result;
}

/**
 * Get all chapter numbers
 */
export function getChapters(): number[] {
  const chapters = new Set<number>();
  Object.values(decks).forEach(deck => chapters.add(deck.chapter));
  return Array.from(chapters).sort((a, b) => a - b);
}

/**
 * Get all deck names for a chapter.
 * 
 * Filters deck registry entries where entry.chapter === targetChapter.
 * Does NOT rely on deck name patterns or deckId naming conventions.
 */
export function getDecksForChapter(chapter: number): string[] {
  return Object.values(decks)
    .filter(deck => deck.chapter === chapter)
    .sort((a, b) => a.order - b.order)
    .map(deck => deck.deckName);
}

/**
 * Get full deck entries (including deckId) for a chapter, sorted by order.
 * 
 * Filters deck registry entries where entry.chapter === targetChapter.
 * This is the source of truth for chapter membership - does NOT rely on
 * deck name patterns or deckId naming conventions.
 * 
 * Prefer this over getDecksForChapter when you need both the id and metadata
 * (e.g. to distinguish match-mode decks that are keyed by deckId).
 */
export function getDeckEntriesForChapter(chapter: number): Array<Deck & { deckId: string }> {
  return Object.entries(decks)
    .filter(([_, deck]) => deck.chapter === chapter)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([deckId, deck]) => ({ deckId, ...deck }));
}

// ─── Internal helpers used by book stats ────────────────────────────────────

type DeckEntry = Deck & { deckId: string };

/** Best time for a single deck entry (mirrors getDeckEntryBestTime in components). */
function _getDeckEntryBestTime(entry: DeckEntry): number | null {
  try {
    if (entry.mode === "match") return getBestTime(entry.deckId);
    const stored = localStorage.getItem(`qc_deck_speedrun_best:${entry.deckName}`);
    return stored !== null ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Chapter rollup time: null unless every deck in the chapter is mastered
 * AND every deck has a recorded best time.
 */
function _getChapterRollupTime(chapter: number): number | null {
  const entries = getDeckEntriesForChapter(chapter);
  try {
    const masteredMap: Record<string, boolean> = JSON.parse(
      localStorage.getItem("quickcard_mastered_sections") ?? "{}"
    );
    let total = 0;
    for (const entry of entries) {
      const mastered =
        entry.mode === "match"
          ? isDeckComplete(entry.deckId)
          : !!masteredMap[entry.deckName];
      if (!mastered) return null;
      const t = _getDeckEntryBestTime(entry);
      if (t === null) return null;
      total += t;
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// ─── Public book helpers ─────────────────────────────────────────────────────

/**
 * All unique book numbers present in decks config, sorted ascending.
 */
export function getBookIds(): number[] {
  const books = new Set<number>();
  Object.values(decks).forEach(deck => {
    if (deck.book !== undefined) books.add(deck.book);
  });
  return Array.from(books).sort((a, b) => a - b);
}

/**
 * All chapter numbers that belong to a given book, sorted ascending.
 */
export function getChaptersForBook(bookId: number): number[] {
  const chapters = new Set<number>();
  Object.values(decks).forEach(deck => {
    if (deck.book === bookId) chapters.add(deck.chapter);
  });
  return Array.from(chapters).sort((a, b) => a - b);
}

/**
 * How many chapters in the book are fully mastered (all decks mastered)
 * vs the total chapter count.
 */
export function getBookMasteryStats(
  bookId: number
): { chaptersComplete: number; chaptersTotal: number } {
  const chapters = getChaptersForBook(bookId);
  try {
    const masteredMap: Record<string, boolean> = JSON.parse(
      localStorage.getItem("quickcard_mastered_sections") ?? "{}"
    );
    let chaptersComplete = 0;
    for (const chapter of chapters) {
      const entries = getDeckEntriesForChapter(chapter);
      const allMastered = entries.every(entry =>
        entry.mode === "match"
          ? isDeckComplete(entry.deckId)
          : !!masteredMap[entry.deckName]
      );
      if (allMastered && entries.length > 0) chaptersComplete++;
    }
    return { chaptersComplete, chaptersTotal: chapters.length };
  } catch {
    return { chaptersComplete: 0, chaptersTotal: chapters.length };
  }
}

/**
 * Sum of all chapter rollup times for the book.
 * Returns null if any chapter is incomplete or missing a best time.
 */
export function getBookBestTime(bookId: number): number | null {
  const chapters = getChaptersForBook(bookId);
  let total = 0;
  for (const chapter of chapters) {
    const t = _getChapterRollupTime(chapter);
    if (t === null) return null;
    total += t;
  }
  return total > 0 ? total : null;
}
