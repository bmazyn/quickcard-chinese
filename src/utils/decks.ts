import type { Deck } from "../types";
import decksData from "../data/decks.json";

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
 * Get all deck names for a chapter
 */
export function getDecksForChapter(chapter: number): string[] {
  return Object.values(decks)
    .filter(deck => deck.chapter === chapter)
    .sort((a, b) => a.order - b.order)
    .map(deck => deck.deckName);
}
