/**
 * meaningRecall.ts
 * Helper functions for the Meaning Recall bonus game mode.
 *
 * Data assumption: each vocab QuizCard has a promptLine formatted as
 * "pinyin — hanzi" (with " — " as separator), and the correct answer
 * choice is the English meaning.
 *
 * "reverse" tagged cards (hanzi → pinyin) and phrase/sentence cards
 * are excluded so each vocab item appears only once per round.
 */

import type { QuizCard } from "../types";
import { getDeckEntriesForChapter } from "./decks";
import quizCardsData from "../data/quizCards.json";

export interface VocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  /** Canonical English meaning — may contain " / " separated alternatives */
  english: string;
}

/**
 * Round size constant.
 * Change this single value to adjust how many words appear per round.
 * Book rollup max = ROUND_SIZE × eligible chapters per book (see getBookMeaningRecallRollup).
 */
export const ROUND_SIZE = 15;

const EXCLUDED_TAGS = new Set([
  "phrase",
  "phrases",
  "reverse",
  "pairs",
  "sentence",
]);

const SEPARATOR = " — ";

/** Parse "pinyin — hanzi" promptLine into its parts. Returns null on unexpected format. */
function parsePromptLine(
  promptLine: string
): { pinyin: string; hanzi: string } | null {
  const idx = promptLine.indexOf(SEPARATOR);
  if (idx === -1) return null;
  const pinyin = promptLine.slice(0, idx).trim();
  const hanzi = promptLine.slice(idx + SEPARATOR.length).trim();
  if (!pinyin || !hanzi) return null;
  return { pinyin, hanzi };
}

/**
 * Extract eligible vocab items for a given set of chapter deck IDs.
 * Deduplicates by hanzi so reverse-tagged card siblings don't appear twice.
 */
export function extractVocabForChapter(
  allCards: QuizCard[],
  chapterDeckIds: Set<string>
): VocabItem[] {
  const seen = new Set<string>(); // dedupe by hanzi
  const items: VocabItem[] = [];

  for (const card of allCards) {
    if (card.kind !== "vocab") continue;
    if (!chapterDeckIds.has(card.deckId)) continue;
    if (card.tags.some((t) => EXCLUDED_TAGS.has(t))) continue;

    const parsed = parsePromptLine(card.promptLine);
    if (!parsed) continue;

    const { pinyin, hanzi } = parsed;
    if (seen.has(hanzi)) continue; // skip reverse-pair duplicates
    seen.add(hanzi);

    items.push({
      id: card.id,
      hanzi,
      pinyin,
      english: card.choices[card.correct],
    });
  }

  return items;
}

/** Fisher-Yates shuffle — returns a new array, does not mutate the original. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a randomised round of up to `size` unique vocab items.
 * Returns fewer items when the chapter pool is smaller than `size`.
 */
export function buildRound(
  vocabItems: VocabItem[],
  size: number = ROUND_SIZE
): VocabItem[] {
  return shuffle(vocabItems).slice(0, size);
}

/**
 * Normalise an English answer string:
 *   – lowercased
 *   – outer whitespace trimmed
 *   – internal runs of whitespace collapsed to a single space
 *
 * Defensively coerces non-string input to a string so it never throws.
 */
export function normalizeAnswer(text: unknown): string {
  if (text == null) return "";
  const s = typeof text === "string" ? text : String(text);
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Split a string on " / " that is NOT inside parentheses.
 *
 * e.g. "possessive particle ('s / of)"  → ["possessive particle ('s / of)"]
 *      "cheap / inexpensive"            → ["cheap", "inexpensive"]
 *      "be / is / are / am"             → ["be", "is", "are", "am"]
 */
function splitSlashOutsideParens(text: string): string[] {
  if (typeof text !== "string" || text === "") return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") { depth++; continue; }
    if (text[i] === ")") { depth--; continue; }

    // Look for " / " only at depth 0
    if (depth === 0 && text[i] === "/" && i > 0 && i < text.length - 1) {
      const before = text[i - 1];
      const after  = text[i + 1];
      if (before === " " && after === " ") {
        // Push the part before this slash (trim the trailing space)
        parts.push(text.slice(start, i - 1).trim());
        start = i + 2; // skip the space after "/"
      }
    }
  }
  // Push the remainder
  parts.push(text.slice(start).trim());

  return parts.filter(Boolean);
}

/**
 * Split a string on " , " (comma with surrounding spaces).
 * Returns the original in a 1-element array when no comma separator is present.
 */
function splitComma(text: string): string[] {
  if (typeof text !== "string" || text === "") return [];
  return text.split(/\s*,\s*/).filter((s) => s.length > 0);
}

/**
 * Given a single phrase (no top-level commas or slashes), expand it into
 * acceptable variants by handling parenthetical text intelligently.
 *
 * Strategy for  `subway (metro)`  or  `possessive particle ('s / of)`:
 *
 *  a) The full original phrase as-is: "subway (metro)"
 *  b) The phrase with all parentheticals stripped: "subway" / "possessive particle"
 *  c) The content inside each pair of parens, split on " / ":
 *       "metro"  /  "'s"  /  "of"
 */
function expandParens(phrase: string): string[] {
  if (typeof phrase !== "string" || phrase === "") return [];
  const variants: string[] = [];

  // (a) Full original
  variants.push(phrase);

  // (b) Strip ALL parenthetical groups
  const withoutParens = phrase.replace(/\s*\([^)]*\)/g, "").trim();
  if (withoutParens && withoutParens !== phrase) {
    variants.push(withoutParens);
  }

  // (c) Content inside each pair of parens, split on " / "
  const parenPattern = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenPattern.exec(phrase)) !== null) {
    const inner = match[1].trim();
    // Use the simple slash split here — we're already inside parens
    inner.split(/\s*\/\s*/).forEach((part) => {
      const p = part.trim();
      if (p) variants.push(p);
    });
  }

  return variants;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert one stored English answer string into the full set of normalised
 * acceptable variants.
 *
 * Pipeline:
 *  1. Always include the full original string (normalised) as a valid answer.
 *  2. Split on " , " (comma-groups like "can (possibility) , can (ability)")
 *  3. For each comma-group, split on " / " that is OUTSIDE parentheses
 *  4. For each resulting phrase, expand parenthetical text (see expandParens)
 *  5. Normalise every candidate; deduplicate; discard empty strings
 *
 * Examples:
 *   "cheap / inexpensive"              → ["cheap / inexpensive","cheap","inexpensive"]
 *   "subway (metro)"                   → ["subway (metro)","subway","metro"]
 *   "possessive particle ('s / of)"    → ["possessive particle ('s / of)",
 *                                          "possessive particle","'s","of"]
 *   "can (possibility) , can (ability)"→ ["can (possibility)","can","possibility",
 *                                          "can (ability)","ability"]
 */
export function getAcceptableAnswers(english: string): string[] {
  // Safe fallback: always return at least the normalised full answer.
  // Called during render — must never throw.
  const fallback = (): string[] => {
    const n = normalizeAnswer(english);
    return n ? [n] : [];
  };

  if (typeof english !== "string" || english === "") return fallback();

  try {
    const candidates: string[] = [];

    // Step 1 – always accept the full original
    candidates.push(english);

    // Step 2 – split on comma-groups
    for (const commaGroup of splitComma(english)) {
      // Step 3 – split on " / " only outside parentheses
      for (const slashPart of splitSlashOutsideParens(commaGroup)) {
        // Step 4 – expand parenthetical synonyms within each phrase
        for (const variant of expandParens(slashPart.trim())) {
          candidates.push(variant);
        }
      }
    }

    // Step 5 – normalise, filter blanks, deduplicate
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of candidates) {
      if (typeof c !== "string") continue;
      const n = normalizeAnswer(c);
      if (n && !seen.has(n)) {
        seen.add(n);
        result.push(n);
      }
    }

    // Guarantee at least one accepted answer
    return result.length > 0 ? result : fallback();
  } catch {
    // Parsing failed for this answer string — accept only the full original
    return fallback();
  }
}

/**
 * Check whether a typed answer matches any acceptable variant of the
 * canonical English meaning. Returns true on a correct match.
 */
export function checkAnswer(typed: string, english: string): boolean {
  const norm = normalizeAnswer(typed);
  if (!norm) return false;
  return getAcceptableAnswers(english).some((ans) => ans === norm);
}

// ─── Persistence (mirrors listeningChallenge pattern) ───────────────────────

export interface MeaningRecallResult {
  correct: number;
  total: number;
}

const MR_KEY_PREFIX = "qc_meaning_recall:";

/**
 * True when the given chapter has at least one eligible vocab item for
 * Meaning Recall (vocab-only, no reverse/phrase/sentence tags).
 * Review chapters that contain only phrases/sentences return false.
 */
export function chapterHasMeaningRecallVocab(chapter: number): boolean {
  const allCards = quizCardsData as QuizCard[];
  const chapterDeckIds = new Set(
    getDeckEntriesForChapter(chapter).map((d) => d.deckId)
  );
  return extractVocabForChapter(allCards, chapterDeckIds).length > 0;
}

/**
 * Load the saved best result for a chapter.
 * Returns null if this chapter has never been played.
 */
export function getMeaningRecallBest(
  chapter: number
): MeaningRecallResult | null {
  try {
    const stored = localStorage.getItem(MR_KEY_PREFIX + chapter);
    return stored ? (JSON.parse(stored) as MeaningRecallResult) : null;
  } catch {
    return null;
  }
}

/**
 * Save a round result for a chapter only when it improves on the stored
 * best (higher correct count).  Returns true when the result was saved.
 */
export function saveMeaningRecallResult(
  chapter: number,
  result: MeaningRecallResult
): boolean {
  try {
    const existing = getMeaningRecallBest(chapter);
    if (!existing || Number(result.correct) > Number(existing.correct)) {
      localStorage.setItem(MR_KEY_PREFIX + chapter, JSON.stringify(result));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Book-level Meaning Recall rollup over an array of chapter numbers.
 *
 * Rules:
 *  - Chapters with no eligible vocab (review chapters) are excluded entirely.
 *  - Eligible chapters with no saved result contribute 0 correct out of ROUND_SIZE.
 *  - Maximum total = eligibleCount × ROUND_SIZE.
 *
 * To adjust which chapters count, change which chapters are passed in, or
 * modify chapterHasMeaningRecallVocab.
 */
export function getBookMeaningRecallRollup(chapters: number[]): {
  correct: number;
  total: number;
  eligibleCount: number;
} {
  let correct = 0;
  let eligibleCount = 0;

  for (const chapter of chapters) {
    if (!chapterHasMeaningRecallVocab(chapter)) continue;
    eligibleCount++;
    const best = getMeaningRecallBest(chapter);
    if (best) correct += Number(best.correct);
  }

  return { correct, total: eligibleCount * ROUND_SIZE, eligibleCount };
}
