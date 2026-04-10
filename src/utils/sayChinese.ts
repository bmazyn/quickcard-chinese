/**
 * sayChinese.ts
 * Helper functions for the "Say Chinese" bonus game mode.
 *
 * Data flow:
 *  - Uses the same VocabItem type / extraction as Meaning Recall
 *    (vocab-only, no reverse/phrase/sentence tags, deduplicated by hanzi)
 *  - Adds speech-comparison helpers that handle two recognition outcomes:
 *      a) Browser returns Chinese characters → compare against hanzi
 *      b) Browser returns romanized/pinyin-like text → compare against
 *         tone-stripped pinyin
 */

import type { QuizCard } from "../types";
import { getDeckEntriesForChapter } from "./decks";
import quizCardsData from "../data/quizCards.json";
import { extractVocabForChapter } from "./meaningRecall";

// Re-export the VocabItem type so consumers don't need a second import.
export type { VocabItem } from "./meaningRecall";
export {
  extractVocabForChapter,
  buildRound,
} from "./meaningRecall";

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROUND_SIZE = 10;

// ─── Eligibility check ───────────────────────────────────────────────────────

/**
 * Returns true when the chapter has at least one eligible vocab item for
 * the Say Chinese mode (vocab-only, no reverse/phrase/sentence tags).
 */
export function chapterHasSayChineseVocab(chapter: number): boolean {
  const allCards = quizCardsData as QuizCard[];
  const chapterDeckIds = new Set(
    getDeckEntriesForChapter(chapter).map((d) => d.deckId)
  );
  return extractVocabForChapter(allCards, chapterDeckIds).length > 0;
}

// ─── Speech normalisation ────────────────────────────────────────────────────

/**
 * Unicode tone marks → plain ASCII letter.
 * Covers all four tones + neutral for a,e,i,o,u,ü and capital variants.
 */
const TONE_MAP: Record<string, string> = {
  // a
  ā: "a", á: "a", ǎ: "a", à: "a",
  // e
  ē: "e", é: "e", ě: "e", è: "e",
  // i
  ī: "i", í: "i", ǐ: "i", ì: "i",
  // o
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  // u
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  // ü (u-umlaut forms)
  ǖ: "u", ǘ: "u", ǚ: "u", ǜ: "u", ü: "u",
  // v (some IMEs use v for ü)
  v: "u",
  // capital versions
  Ā: "a", Á: "a", Ǎ: "a", À: "a",
  Ē: "e", É: "e", Ě: "e", È: "e",
  Ī: "i", Í: "i", Ǐ: "i", Ì: "i",
  Ō: "o", Ó: "o", Ǒ: "o", Ò: "o",
  Ū: "u", Ú: "u", Ǔ: "u", Ù: "u",
  Ǖ: "u", Ǘ: "u", Ǚ: "u", Ǜ: "u", Ü: "u",
};

/**
 * Strip tone diacritics and tone numbers (1-4), collapse spaces, lower-case.
 *
 * Examples:
 *   "nǐ hǎo"   → "nihao"
 *   "ni3 hao3" → "nihao"
 *   "Wǒ"       → "wo"
 */
export function normalizePinyin(text: string): string {
  return text
    .toLowerCase()
    .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüvĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ]/g, (ch) => TONE_MAP[ch] ?? ch)
    .replace(/[1-4]/g, "")          // drop tone digits
    .replace(/\s+/g, "");           // collapse spaces
}

/**
 * Detect whether a string is (primarily) Chinese characters.
 * Returns true when ≥ half the non-whitespace/non-punctuation chars are CJK.
 * Covers the four main Unicode CJK blocks.
 */
export function isChinese(text: string): boolean {
  // Strip whitespace and punctuation before measuring
  const chars = [...text.replace(/[\s\p{P}]/gu, "")];
  if (chars.length === 0) return false;
  const cjk = chars.filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) ||   // CJK Unified Ideographs
      (cp >= 0x3400 && cp <= 0x4dbf) ||   // CJK Extension A
      (cp >= 0xf900 && cp <= 0xfaff) ||   // CJK Compatibility Ideographs
      (cp >= 0x20000 && cp <= 0x2a6df)    // CJK Extension B (surrogate-pair range)
    );
  }).length;
  return cjk / chars.length >= 0.5;
}

/**
 * Remove punctuation that browsers routinely append to speech results.
 *
 * Chrome/Edge (zh-CN) frequently returns hanzi with trailing Chinese
 * punctuation: "你好。" "早上好！" "谢谢你，"
 * Stripping these before any comparison is the single biggest source of
 * false negatives in the answer checker.
 *
 * Characters removed:
 *  - Chinese: 。，！？、；：""''…—～·《》【】「」
 *  - ASCII:   . , ! ? ; : ' " -
 */
export function cleanSpeechRaw(raw: string): string {
  return raw
    .trim()
    .replace(/[。，！？、；：\u201c\u201d\u2018\u2019\u2026\u2014\uff5e\u00b7\u300a\u300b\u3010\u3011\u300c\u300d]/g, "")
    .replace(/[.,!?;:'"\\-]/g, "")
    .trim();
}

/**
 * Normalise a speech-recognition result for comparison.
 * 1. Strip punctuation the browser appends (cleanSpeechRaw).
 * 2. If result contains Chinese characters → collapse spaces (hanzi path).
 * 3. Otherwise treat as pinyin: strip tones + spaces (pinyin path).
 */
export function normalizeSpeechResult(raw: string): string {
  const cleaned = cleanSpeechRaw(raw);
  if (isChinese(cleaned)) {
    return cleaned.replace(/\s+/g, "");
  }
  return normalizePinyin(cleaned);
}

// ─── Rich comparison result (used by component for debug display) ────────────

/**
 * Full result returned by checkSpeechAnswer.
 * All fields are always populated so the component can render a complete
 * debug panel without any conditional checks.
 */
export interface SpeechCheckResult {
  isCorrect: boolean;
  /** Browser output after punctuation stripping */
  cleanedRaw: string;
  /** Value actually compared against expected (hanzi or pinyin-normalised) */
  normalizedSpeech: string;
  /** Which comparison branch was taken */
  matchPath: "hanzi" | "pinyin";
  /** Expected hanzi with spaces collapsed */
  expectedHanzi: string;
  /** Expected tone-stripped pinyin */
  expectedNormalizedPinyin: string;
}

/**
 * Core comparison function for Say Chinese.
 *
 * Detection / normalisation pipeline:
 *  1. cleanSpeechRaw()  – remove punctuation the browser appends
 *  2. isChinese()       – decide which path to take
 *  3a. Hanzi path  – collapse spaces only, compare against expectedHanzi
 *  3b. Pinyin path – lowercase + strip tones + digits + spaces,
 *                    compare against tone-stripped stored pinyin
 *
 * Returns a SpeechCheckResult so every step is visible for debugging.
 */
export function checkSpeechAnswer(
  raw: string,
  hanzi: string,
  pinyin: string
): SpeechCheckResult {
  const expectedHanzi            = hanzi.replace(/\s+/g, "");
  const expectedNormalizedPinyin = normalizePinyin(pinyin);

  const cleanedRaw = cleanSpeechRaw(raw);

  if (!cleanedRaw) {
    return {
      isCorrect: false,
      cleanedRaw: "",
      normalizedSpeech: "",
      matchPath: "hanzi",
      expectedHanzi,
      expectedNormalizedPinyin,
    };
  }

  if (isChinese(cleanedRaw)) {
    const normalizedSpeech = cleanedRaw.replace(/\s+/g, "");
    return {
      isCorrect: normalizedSpeech === expectedHanzi,
      cleanedRaw,
      normalizedSpeech,
      matchPath: "hanzi",
      expectedHanzi,
      expectedNormalizedPinyin,
    };
  }

  // Pinyin path — also used when the browser returns romanized output
  const normalizedSpeech = normalizePinyin(cleanedRaw);
  return {
    isCorrect: normalizedSpeech === expectedNormalizedPinyin,
    cleanedRaw,
    normalizedSpeech,
    matchPath: "pinyin",
    expectedHanzi,
    expectedNormalizedPinyin,
  };
}

/**
 * Convenience boolean wrapper — keeps existing call-sites unchanged.
 */
export function compareSpeechToVocab(
  raw: string,
  hanzi: string,
  pinyin: string
): boolean {
  return checkSpeechAnswer(raw, hanzi, pinyin).isCorrect;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export interface SayChineseResult {
  correct: number;
  total: number;
}

const SC_KEY_PREFIX = "qc_say_chinese:";

export function getSayChineseBest(chapter: number): SayChineseResult | null {
  try {
    const stored = localStorage.getItem(SC_KEY_PREFIX + chapter);
    return stored ? (JSON.parse(stored) as SayChineseResult) : null;
  } catch {
    return null;
  }
}

/**
 * Save the round result only when it improves on the stored best
 * (more correct answers). Returns true when the result was saved.
 */
export function saveSayChineseResult(
  chapter: number,
  result: SayChineseResult
): boolean {
  try {
    const existing = getSayChineseBest(chapter);
    if (!existing || Number(result.correct) > Number(existing.correct)) {
      localStorage.setItem(SC_KEY_PREFIX + chapter, JSON.stringify(result));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
