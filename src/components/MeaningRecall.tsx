import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getAllDecks } from "../utils/decks";
import {
  extractVocabForChapter,
  buildRound,
  checkAnswer,
  getAcceptableAnswers,
  normalizeAnswer,
  ROUND_SIZE,
  saveMeaningRecallResult,
  type VocabItem,
} from "../utils/meaningRecall";
import "./MeaningRecall.css";

/**
 * Card phase:
 *   "input"         – user is typing their answer
 *   "correct-flash" – briefly shows green flash after a correct answer
 *   "reveal"        – shows the correct answer after a wrong answer
 */
type CardPhase = "input" | "correct-flash" | "reveal";

/** Top-level game phase */
type GamePhase = "playing" | "done";

export default function MeaningRecall() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const chapter = chapterId ? Number(chapterId) : 1;

  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayedCardIdRef = useRef<string>("");

  // ── round state ─────────────────────────────────────────────────────────
  const [gameKey, setGameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<VocabItem[]>([]);
  const [noCards, setNoCards] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [cardPhase, setCardPhase] = useState<CardPhase>("input");
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState(0);

  // ── build round on mount / restart ──────────────────────────────────────
  useEffect(() => {
    // Signal that we are (re-)loading
    setLoading(true);

    // Clear any lingering flash timer
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    const allCards = quizCardsData as QuizCard[];
    const chapterDeckIds = new Set(
      getAllDecks()
        .filter((d) => d.chapter === chapter)
        .map((d) => d.deckId)
    );

    const vocab = extractVocabForChapter(allCards, chapterDeckIds);

    if (vocab.length === 0) {
      setNoCards(true);
      setLoading(false);
      return;
    }

    const r = buildRound(vocab, ROUND_SIZE);
    setRound(r);
    setNoCards(false);
    setCurrentIndex(0);
    setInputValue("");
    setCardPhase("input");
    setGamePhase("playing");
    setCorrect(0);
    setMisses(0);
    setLoading(false);
  }, [chapter, gameKey]);

  // ── autofocus input on each new card ────────────────────────────────────
  useEffect(() => {
    if (gamePhase === "playing" && cardPhase === "input") {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [currentIndex, cardPhase, gamePhase]);

  // ── cleanup flash timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // ── persist best result when round ends ──────────────────────────────
  // Fires once when gamePhase transitions to "done".
  // By that point all setCorrect() calls for the round have already settled.
  useEffect(() => {
    if (gamePhase !== "done" || round.length === 0) return;
    saveMeaningRecallResult(chapter, { correct, total: round.length });
  }, [gamePhase, correct, round.length, chapter]);

  // ── play hanzi via browser speech synthesis (reused from QuizCard pattern) ─
  const playHanziAudio = useCallback((hanzi: string) => {
    if (!hanzi || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(hanzi);
    utterance.lang = "zh-CN";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── auto-play audio once per new card ───────────────────────────────────
  // Deps: currentIndex + round reference change when we advance/restart.
  // lastPlayedCardIdRef guards against double-play if the effect re-fires
  // for the same card (e.g. React StrictMode double-invoke).
  useEffect(() => {
    if (gamePhase !== "playing" || round.length === 0) return;
    const card = round[currentIndex];
    if (!card?.hanzi) return;
    if (lastPlayedCardIdRef.current === card.id) return;
    lastPlayedCardIdRef.current = card.id;

    // Small delay matches the pattern used in QuizFeed to avoid iOS quirks
    window.speechSynthesis?.cancel();
    audioTimerRef.current = setTimeout(() => {
      playHanziAudio(card.hanzi);
      audioTimerRef.current = null;
    }, 100);

    return () => {
      if (audioTimerRef.current !== null) {
        clearTimeout(audioTimerRef.current);
        audioTimerRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, [currentIndex, gamePhase, round, playHanziAudio]);

  // ── advance to next card (or end round) ─────────────────────────────────
  const advanceCard = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex >= round.length) {
        setGamePhase("done");
      } else {
        setCurrentIndex(nextIndex);
        setInputValue("");
        setCardPhase("input");
      }
    },
    [round.length]
  );

  // ── submit answer ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (cardPhase !== "input") return;
    const card = round[currentIndex];
    if (!card) return;

    const isCorrect = checkAnswer(inputValue, card.english);

    if (isCorrect) {
      setCorrect((c) => c + 1);
      setCardPhase("correct-flash");
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        advanceCard(currentIndex);
      }, 380);
    } else {
      setMisses((m) => m + 1);
      setCardPhase("reveal");
    }
  }, [cardPhase, currentIndex, inputValue, round, advanceCard]);

  // ── continue after wrong reveal ──────────────────────────────────────────
  const handleContinue = useCallback(() => {
    advanceCard(currentIndex);
  }, [advanceCard, currentIndex]);

  // ── keyboard: Enter submits / continues ─────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleContinueKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleContinue();
      }
    },
    [handleContinue]
  );

  const handleRestart = () => setGameKey((k) => k + 1);
  const handleBack = () => navigate(`/chapter/${chapter}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading: effect hasn't finished populating the round yet
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mr-page">
        <div className="mr-shell">
          <header className="mr-header">
            <button className="mr-back-btn" onClick={handleBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="mr-header-center">
              <span className="mr-title">Meaning Recall</span>
              <span className="mr-subtitle">Chapter {chapter}</span>
            </div>
            <div className="mr-header-right-spacer" />
          </header>
          <div className="mr-loading">
            <span className="mr-loading-icon">✍️</span>
            <span className="mr-loading-text">Loading vocab…</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state: no eligible vocab in this chapter
  // ─────────────────────────────────────────────────────────────────────────
  if (noCards) {
    return (
      <div className="mr-page">
        <div className="mr-shell">
          <header className="mr-header">
            <button className="mr-back-btn" onClick={handleBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="mr-header-center">
              <span className="mr-title">Meaning Recall</span>
              <span className="mr-subtitle">Chapter {chapter}</span>
            </div>
            <div className="mr-header-right-spacer" />
          </header>

          <div className="mr-empty">
            <span className="mr-empty-icon">📭</span>
            <p className="mr-empty-msg">
              No vocab cards found for Chapter {chapter}.<br />
              Try a different chapter.
            </p>
            <button className="mr-btn-secondary" onClick={handleBack}>← Back to Chapter</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Done / summary screen
  // ─────────────────────────────────────────────────────────────────────────
  if (gamePhase === "done") {
    const total = round.length;
    const perfect = misses === 0;
    return (
      <div className="mr-page">
        <div className="mr-shell">
          <header className="mr-header">
            <button className="mr-back-btn" onClick={handleBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="mr-header-center">
              <span className="mr-title">Meaning Recall</span>
              <span className="mr-subtitle">Chapter {chapter}</span>
            </div>
            <div className="mr-header-right-spacer" />
          </header>

          <div className="mr-done">
            <div className="mr-done-emoji">
              {perfect ? "🏆" : misses <= 2 ? "⭐" : "📝"}
            </div>
            <h2 className="mr-done-title">
              {perfect ? "Perfect Round!" : "Round Complete"}
            </h2>
            <p className="mr-done-goal">
              {perfect
                ? "You cleared all " + total + " with 0 misses!"
                : "Can you clear all " + total + " with 0 misses?"}
            </p>

            <div className="mr-done-stats">
              <div className="mr-done-stat">
                <span className="mr-done-stat-value mr-done-stat-correct">
                  {correct}/{total}
                </span>
                <span className="mr-done-stat-label">First try</span>
              </div>
              <div className="mr-done-stat-divider" />
              <div className="mr-done-stat">
                <span
                  className={`mr-done-stat-value ${
                    misses > 0 ? "mr-done-stat-miss" : "mr-done-stat-correct"
                  }`}
                >
                  {misses}
                </span>
                <span className="mr-done-stat-label">Misses</span>
              </div>
            </div>

            <div className="mr-done-actions">
              <button className="mr-btn-primary" onClick={handleRestart}>
                🔄 New Round
              </button>
              <button className="mr-btn-secondary" onClick={handleBack}>
                ← Back to Chapter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Playing
  // ─────────────────────────────────────────────────────────────────────────
  const card = round[currentIndex];
  const cardNum = currentIndex + 1;
  const total = round.length;

  const cardClassMod =
    cardPhase === "correct-flash"
      ? "mr-card--correct"
      : cardPhase === "reveal"
      ? "mr-card--wrong"
      : "";

  return (
    <div className="mr-page">
      <div className="mr-shell">
        {/* ── Header ── */}
        <header className="mr-header">
          <button className="mr-back-btn" onClick={handleBack} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="mr-header-center">
            <span className="mr-title">Meaning Recall</span>
            <span className="mr-subtitle">Chapter {chapter}</span>
          </div>

          <div className="mr-progress-badge">
            <span className="mr-progress-num">{cardNum}</span>
            <span className="mr-progress-sep">/</span>
            <span className="mr-progress-total">{total}</span>
          </div>
        </header>

        {/* ── Stats bar ── */}
        <div className="mr-stats-bar">
          <span className="mr-stat-item mr-stat-correct">✓ {correct}</span>
          <span className="mr-stat-divider" />
          <span className="mr-stat-item mr-stat-miss">✗ {misses}</span>
        </div>

        {/* ── Card area ── */}
        <div className="mr-card-area">
          <div className={`mr-card ${cardClassMod}`}>
            <div
              className="mr-hanzi"
              onClick={() => playHanziAudio(card.hanzi)}
              role="button"
              tabIndex={0}
              aria-label={`Replay pronunciation of ${card.hanzi}`}
              title="Tap to replay audio"
            >
              {card.hanzi}
            </div>
            <div className="mr-pinyin">{card.pinyin}</div>

            {/* Correct flash overlay */}
            {cardPhase === "correct-flash" && (
              <div className="mr-correct-flash-label">✓ Correct!</div>
            )}
          </div>

          {/* ── Input row (while user is answering) ── */}
          {cardPhase === "input" && (
            <div className="mr-input-area">
              <input
                ref={inputRef}
                className="mr-input"
                type="text"
                placeholder="Type the English meaning…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                className="mr-submit-btn"
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
              >
                Check →
              </button>
            </div>
          )}

          {/* ── Reveal row (after wrong answer) ── */}
          {cardPhase === "reveal" && (
            <div className="mr-reveal-area">
              <div className="mr-reveal-your-answer">
                <span className="mr-reveal-your-label">Your answer:</span>
                <span className="mr-reveal-your-text">
                  "{normalizeAnswer(inputValue) || "—"}"
                </span>
              </div>

              <div className="mr-reveal-correct-box">
                <span className="mr-reveal-correct-label">Correct answer</span>
                <span className="mr-reveal-correct-text">{card.english}</span>
                {getAcceptableAnswers(card.english).length > 2 && (
                  <span className="mr-reveal-hint">
                    Any variant accepted
                  </span>
                )}
              </div>

              <button
                className="mr-continue-btn"
                onClick={handleContinue}
                onKeyDown={handleContinueKeyDown}
                autoFocus
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Spacer while flash is happening (prevents layout jump) ── */}
          {cardPhase === "correct-flash" && (
            <div className="mr-flash-spacer" />
          )}
        </div>
      </div>
    </div>
  );
}
