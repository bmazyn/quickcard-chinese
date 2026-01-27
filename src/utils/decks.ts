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
