import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckEntriesForChapter } from "./decks";

export const CHAPTER_REVIEW_QUESTION_COUNT = 10;
export const CHAPTER_REVIEW_TOP_SCORE_COUNT = 10;
export const CHAPTER_REVIEW_DASHBOARD_SCORE_COUNT = 5;

const TOP_SCORES_KEY_PREFIX = "qc_chapter_review_top_scores_v1_10q:";
const NO_PINYIN_TOP_SCORES_KEY_PREFIX =
  "qc_chapter_review_top_scores_v1_10q_no_pinyin:";

function topScoresKey(chapter: number, noPinyin: boolean): string {
  return (noPinyin ? NO_PINYIN_TOP_SCORES_KEY_PREFIX : TOP_SCORES_KEY_PREFIX) + chapter;
}

export function getChapterReviewTopScores(
  chapter: number,
  noPinyin = false
): number[] {
  try {
    const stored = localStorage.getItem(topScoresKey(chapter, noPinyin));
    if (!stored) return [];

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (score): score is number =>
          typeof score === "number" &&
          Number.isInteger(score) &&
          score >= 0 &&
          score <= CHAPTER_REVIEW_QUESTION_COUNT
      )
      .sort((a, b) => b - a)
      .slice(0, CHAPTER_REVIEW_TOP_SCORE_COUNT);
  } catch {
    return [];
  }
}

export function saveChapterReviewScore(
  chapter: number,
  score: number,
  noPinyin = false
): number[] {
  const normalizedScore = Math.max(
    0,
    Math.min(CHAPTER_REVIEW_QUESTION_COUNT, Math.round(score))
  );
  const topScores = [...getChapterReviewTopScores(chapter, noPinyin), normalizedScore]
    .sort((a, b) => b - a)
    .slice(0, CHAPTER_REVIEW_TOP_SCORE_COUNT);

  try {
    localStorage.setItem(topScoresKey(chapter, noPinyin), JSON.stringify(topScores));
  } catch {
    /* ignore storage errors */
  }

  return topScores;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getEligibleCardsForChapter(chapter: number): QuizCard[] {
  const chapterDeckIds = new Set(
    getDeckEntriesForChapter(chapter)
      .filter((deck) => deck.mode !== "match")
      .map((deck) => deck.deckId)
  );

  return (quizCardsData as QuizCard[]).filter(
    (card) =>
      (card.kind === "vocab" || card.kind === "sentence" || card.kind === "phrase") &&
      chapterDeckIds.has(card.deckId)
  );
}

export function buildChapterReviewSession(
  chapter: number,
  noPinyin = false
): QuizCard[] {
  const eligibleCards = getEligibleCardsForChapter(chapter).filter(
    (card) => !noPinyin || !card.tags.includes("reverse")
  );

  return shuffle(eligibleCards).slice(
    0,
    CHAPTER_REVIEW_QUESTION_COUNT
  );
}
