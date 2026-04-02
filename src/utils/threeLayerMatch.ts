/**
 * threeLayerMatch.ts
 * Helper functions for the 3-Layer Match bonus game mode.
 *
 * Data assumption: each vocab QuizCard has a promptLine formatted as
 * "pinyin — hanzi" (with " — " as separator), and the correct answer
 * choice is the English meaning.
 *
 * "reverse" tagged cards (hanzi → pinyin) and phrase/sentence cards
 * are excluded so each vocab item appears only once on the board.
 */

import type { QuizCard } from "../types";
import { getDeckEntriesForChapter } from "./decks";
import quizCardsData from "../data/quizCards.json";

export interface VocabTriple {
  /** Unique identifier (derived from the source card id) */
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
}

const EXCLUDED_TAGS = new Set(["phrase", "phrases", "reverse", "pairs", "sentence"]);
const SEPARATOR = " — ";

/**
 * Parse a promptLine into { pinyin, hanzi }.
 * Returns null when the line doesn't match the expected format.
 */
function parsePromptLine(promptLine: string): { pinyin: string; hanzi: string } | null {
  const idx = promptLine.indexOf(SEPARATOR);
  if (idx === -1) return null;
  const pinyin = promptLine.slice(0, idx).trim();
  const hanzi = promptLine.slice(idx + SEPARATOR.length).trim();
  if (!pinyin || !hanzi) return null;
  return { pinyin, hanzi };
}

/**
 * Extract eligible vocab triples from a full card list for a given chapter.
 * Deduplicates by hanzi so reverse-tagged siblings don't appear twice.
 */
export function extractVocabTriples(
  allCards: QuizCard[],
  chapterDeckIds: Set<string>
): VocabTriple[] {
  const seen = new Set<string>(); // dedupe by hanzi

  const triples: VocabTriple[] = [];

  for (const card of allCards) {
    if (card.kind !== "vocab") continue;
    if (!chapterDeckIds.has(card.deckId)) continue;
    if (card.tags.some((t) => EXCLUDED_TAGS.has(t))) continue;

    const parsed = parsePromptLine(card.promptLine);
    if (!parsed) continue;

    const { pinyin, hanzi } = parsed;
    if (seen.has(hanzi)) continue; // dedup reverse pairs
    seen.add(hanzi);

    triples.push({
      id: card.id,
      hanzi,
      pinyin,
      english: card.choices[card.correct],
    });
  }

  return triples;
}

/**
 * Fisher-Yates shuffle – returns a new array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const BOARD_SIZE = 15;

export interface ThreeLayerBoard {
  /** The 9 canonical vocab items (source of truth for matching) */
  items: VocabTriple[];
  /** Shuffled index arrays – each number points into items[] */
  hanziOrder: number[];
  pinyinOrder: number[];
  englishOrder: number[];
}

/**
 * Pick BOARD_SIZE random items from eligible triples and build a board.
 * Returns null when there are fewer eligible triples than BOARD_SIZE.
 */
export function buildBoard(triples: VocabTriple[]): ThreeLayerBoard | null {
  if (triples.length < BOARD_SIZE) return null;

  const selected = shuffle(triples).slice(0, BOARD_SIZE);

  const indices = Array.from({ length: BOARD_SIZE }, (_, i) => i);

  return {
    items: selected,
    hanziOrder: shuffle(indices),
    pinyinOrder: shuffle(indices),
    englishOrder: shuffle(indices),
  };
}

/**
 * Check whether the three selected positions (each pointing into their
 * respective row's order array) all refer to the same vocab item.
 */
export function isValidTriple(
  board: ThreeLayerBoard,
  hanziPos: number,
  pinyinPos: number,
  englishPos: number
): boolean {
  const hi = board.hanziOrder[hanziPos];
  const pi = board.pinyinOrder[pinyinPos];
  const ei = board.englishOrder[englishPos];
  return hi === pi && pi === ei;
}

/**
 * Check whether the two selected positions (hanzi row and english row)
 * refer to the same vocab item. Used by the 2-layer (pinyin-free) mode.
 */
export function isValidPair(
  board: ThreeLayerBoard,
  hanziPos: number,
  englishPos: number
): boolean {
  const hi = board.hanziOrder[hanziPos];
  const ei = board.englishOrder[englishPos];
  return hi === ei;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const TLM_BEST_KEY_PREFIX = "qc_3lm_best:";

/**
 * True when the chapter has at least BOARD_SIZE eligible vocab triples
 * for 3-Layer Match. Review chapters that contain only phrases/sentences
 * return false and are excluded from rollups.
 */
export function chapterHas3LayerMatchVocab(chapter: number): boolean {
  const allCards = quizCardsData as QuizCard[];
  const chapterDeckIds = new Set(
    getDeckEntriesForChapter(chapter).map((d) => d.deckId)
  );
  return extractVocabTriples(allCards, chapterDeckIds).length >= BOARD_SIZE;
}

/**
 * Load the saved best time (in whole seconds) for a chapter's 3-Layer Match.
 * Returns null if the mode has never been completed for this chapter.
 */
export function get3LayerMatchBest(chapter: number): number | null {
  try {
    const stored = localStorage.getItem(TLM_BEST_KEY_PREFIX + chapter);
    return stored !== null ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Persist a 3-Layer Match completion time for a chapter.
 * Only updates when the new time is strictly faster than the existing best.
 * Returns true when the stored best was updated.
 */
export function save3LayerMatchBest(chapter: number, seconds: number): boolean {
  try {
    const existing = get3LayerMatchBest(chapter);
    if (existing === null || seconds < existing) {
      localStorage.setItem(TLM_BEST_KEY_PREFIX + chapter, seconds.toString());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Book-level 3-Layer Match rollup over an array of chapter numbers.
 *
 * Rules:
 *  – Chapters without enough vocab (review/phrase-only chapters) are excluded.
 *  – Returns null if any eligible chapter has no saved best time yet.
 *  – Returns { totalSeconds, eligibleCount } once every eligible chapter
 *    has a recorded best time.
 */
export function getBook3LayerMatchRollup(
  chapters: number[]
): { totalSeconds: number; eligibleCount: number } | null {
  const eligible = chapters.filter(chapterHas3LayerMatchVocab);
  if (eligible.length === 0) return null;

  let total = 0;
  for (const chapter of eligible) {
    const best = get3LayerMatchBest(chapter);
    if (best === null) return null; // not all eligible chapters completed yet
    total += best;
  }
  return { totalSeconds: total, eligibleCount: eligible.length };
}
