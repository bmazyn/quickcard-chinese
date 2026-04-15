import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import {
  buildBookReviewSession,
  getReviewPool,
  addToReviewPool,
  removeFromReviewPool,
  saveBookReviewResult,
  SESSION_SIZE,
  MAX_PERFECT_CLEARS,
  type BookReviewStats,
} from "../utils/bookReview";
import "./BookReview.css";
import "./QuizFeed.css";

export default function BookReview() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const bookNumber = bookId ? parseInt(bookId, 10) : 0;

  const [session, setSession] = useState<QuizCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>({
    selectedChoice: null,
    isCorrect: null,
  });
  const [correctCount, setCorrectCount] = useState(0);
  const [poolCount, setPoolCount] = useState(0);
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const [audioOnCorrect, setAudioOnCorrect] = useState(true);
  const reinforcementTimeoutRef = useRef<number | null>(null);
  const [savedStats, setSavedStats] = useState<BookReviewStats | null>(null);
  const [savedClears, setSavedClears] = useState(0);

  // Build initial session and load pool count on mount
  useEffect(() => {
    setSession(buildBookReviewSession(bookNumber));
    setPoolCount(getReviewPool(bookNumber).length);
  }, [bookNumber]);

  // Auto-play hanzi audio on each new card (same pattern as QuizFeed)
  useEffect(() => {
    if (!isStarted || session.length === 0 || currentIndex >= session.length) return;
    if (answerState.selectedChoice !== null) return;
    if (!("speechSynthesis" in window)) return;

    const currentCard = session[currentIndex];
    const hanzi = currentCard.promptLine.split(" — ")[1];
    if (!hanzi) return;

    window.speechSynthesis.cancel();
    const timeout = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }, 100);

    return () => {
      clearTimeout(timeout);
      window.speechSynthesis.cancel();
    };
  }, [isStarted, session, currentIndex, answerState.selectedChoice]);

  // Cleanup reinforcement timeout on unmount
  useEffect(() => {
    return () => {
      if (reinforcementTimeoutRef.current !== null) {
        clearTimeout(reinforcementTimeoutRef.current);
      }
    };
  }, []);

  // ── Shared reinforcement audio logic (identical to QuizFeed) ────────────
  const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);

  const extractHanziFromChoice = (choiceText: string): string => {
    if (choiceText.includes("—")) return choiceText.split("—")[1].trim();
    const match = choiceText.match(/[\u4e00-\u9fff]+/);
    return match ? match[0] : "";
  };

  const playReinforcementForCard = (card: QuizCardType) => {
    if (!("speechSynthesis" in window)) return;
    if (isPlayingReinforcement) return;
    if (reinforcementTimeoutRef.current !== null) clearTimeout(reinforcementTimeoutRef.current);

    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);

    const isReverse = card.tags?.includes("reverse") || !hasChinese(card.promptLine);

    if (isReverse) {
      const englishUtterance = new SpeechSynthesisUtterance(card.promptLine);
      englishUtterance.lang = "en-US";
      englishUtterance.rate = 0.9;
      englishUtterance.onend = () => {
        reinforcementTimeoutRef.current = window.setTimeout(() => {
          const hanzi = extractHanziFromChoice(card.choices[card.correct]);
          if (hanzi) {
            const ch = new SpeechSynthesisUtterance(hanzi);
            ch.lang = "zh-CN";
            ch.rate = 0.9;
            ch.onend = () => setIsPlayingReinforcement(false);
            ch.onerror = () => setIsPlayingReinforcement(false);
            window.speechSynthesis.speak(ch);
          } else {
            setIsPlayingReinforcement(false);
          }
        }, 0);
      };
      englishUtterance.onerror = () => setIsPlayingReinforcement(false);
      window.speechSynthesis.speak(englishUtterance);
    } else {
      const hanzi = card.promptLine.split(" — ")[1];
      const chineseUtterance = new SpeechSynthesisUtterance(hanzi);
      chineseUtterance.lang = "zh-CN";
      chineseUtterance.rate = 0.9;
      chineseUtterance.onend = () => {
        reinforcementTimeoutRef.current = window.setTimeout(() => {
          const en = new SpeechSynthesisUtterance(card.choices[card.correct]);
          en.lang = "en-US";
          en.rate = 0.9;
          en.onend = () => setIsPlayingReinforcement(false);
          en.onerror = () => setIsPlayingReinforcement(false);
          window.speechSynthesis.speak(en);
        }, 0);
      };
      chineseUtterance.onerror = () => setIsPlayingReinforcement(false);
      window.speechSynthesis.speak(chineseUtterance);
    }
  };

  const handleReinforcementAudio = () => {
    if (answerState.selectedChoice === null) return;
    playReinforcementForCard(session[currentIndex]);
  };

  // ────────────────────────────────────────────────────────────────────────

  const handleStart = () => {
    const cards = buildBookReviewSession(bookNumber);
    setSession(cards);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswerState({ selectedChoice: null, isCorrect: null });
    setIsStarted(true);
    setIsComplete(false);
  };

  const handleAnswer = (choice: ChoiceKey) => {
    const currentCard = session[currentIndex];
    const isCorrect = choice === currentCard.correct;
    setAnswerState({ selectedChoice: choice, isCorrect });

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      removeFromReviewPool(bookNumber, currentCard.id);
    } else {
      addToReviewPool(bookNumber, currentCard.id);
    }

    // Auto-play reinforcement audio (same logic as QuizFeed)
    const shouldPlay = !isCorrect || audioOnCorrect;
    if (shouldPlay) {
      setTimeout(() => playReinforcementForCard(currentCard), 400);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= session.length) {
      const result = saveBookReviewResult(bookNumber, correctCount, session.length);
      setSavedStats(result.stats);
      setSavedClears(result.clears);
      setIsComplete(true);
      setIsStarted(false);
      setPoolCount(getReviewPool(bookNumber).length);
    } else {
      setCurrentIndex(nextIndex);
      setAnswerState({ selectedChoice: null, isCorrect: null });
    }
  };

  const handleRunAgain = () => {
    handleStart();
  };

  const handleBack = () => {
    window.speechSynthesis?.cancel();
    navigate(`/books/${bookNumber}`);
  };

  // ── No eligible cards ────────────────────────────────────────────────────
  if (!isStarted && !isComplete && session.length === 0) {
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack} aria-label="Go back">
              ← Back
            </button>
            <h2 className="book-review-title">Book {bookNumber} — Review</h2>
          </div>
          <p className="book-review-no-cards">No cards found for this book.</p>
        </div>
      </div>
    );
  }

  // ── Pre-run screen ───────────────────────────────────────────────────────
  if (!isStarted && !isComplete) {
    const prePoolCount = getReviewPool(bookNumber).length;
    const cardCount = Math.min(session.length, SESSION_SIZE);
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack} aria-label="Go back">
              ← Back
            </button>
            <h2 className="book-review-title">Book {bookNumber} — Review</h2>
          </div>

          <div className="book-review-prerun">
            <div className="book-review-info-card">
              <div className="book-review-info-icon">📖</div>
              <div className="book-review-info-text">
                <h3>Book Review</h3>
                <p>{cardCount} cards · All card types · Untimed</p>
                {prePoolCount > 0 && (
                  <p className="book-review-pool-hint">
                    🔁 Review pool: {prePoolCount} card{prePoolCount !== 1 ? "s" : ""} included
                  </p>
                )}
              </div>
            </div>
            <button className="book-review-start-btn" onClick={handleStart}>
              Start Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── End screen ───────────────────────────────────────────────────────────
  if (isComplete) {
    const total  = session.length;
    const pct    = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isPerfect = correctCount === total && total > 0;
    const bestStats  = savedStats;
    const clears     = savedClears;
    const bestPct    = bestStats && bestStats.bestTotal > 0
      ? Math.round((bestStats.bestCorrect / bestStats.bestTotal) * 100)
      : null;

    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack} aria-label="Go back">
              ← Back
            </button>
            <h2 className="book-review-title">Book {bookNumber} — Review</h2>
          </div>

          <div className="book-review-complete">
            <div className="book-review-complete-icon">{isPerfect ? "🏆" : "📖"}</div>
            <h3 className="book-review-complete-title">
              {isPerfect ? "Perfect Clear!" : "Session Complete!"}
            </h3>

            <div className="book-review-stats-table">
              <div className="book-review-stat-row">
                <span className="book-review-stat-label">Score</span>
                <span className="book-review-stat-value">
                  {correctCount} / {total}
                  <span className="book-review-stat-pct"> • {pct}%</span>
                </span>
              </div>
              {bestStats && (
                <div className="book-review-stat-row">
                  <span className="book-review-stat-label">Best</span>
                  <span className="book-review-stat-value">
                    {bestStats.bestCorrect} / {bestStats.bestTotal}
                    <span className="book-review-stat-pct"> • {bestPct}%</span>
                  </span>
                </div>
              )}
              <div className="book-review-stat-row">
                <span className="book-review-stat-label">Review Pool</span>
                <span className="book-review-stat-value">{poolCount}</span>
              </div>
              <div className="book-review-stat-row book-review-clears-row">
                <span className="book-review-stat-label">Perfect Clears</span>
                <span className="book-review-stat-value">
                  <span className="book-review-clears-pips">
                    {Array.from({ length: MAX_PERFECT_CLEARS }).map((_, i) => (
                      <span
                        key={i}
                        className={i < clears ? "book-review-pip filled" : "book-review-pip"}
                      />
                    ))}
                  </span>
                  <span className="book-review-clears-count">{clears} / {MAX_PERFECT_CLEARS}</span>
                </span>
              </div>
            </div>

            <div className="book-review-complete-btns">
              <button className="book-review-again-btn" onClick={handleRunAgain}>
                🔄 New Session
              </button>
              <button className="book-review-done-btn" onClick={handleBack}>
                ← Back to Book
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  if (session.length === 0 || currentIndex >= session.length) return null;

  const currentCard = session[currentIndex];

  return (
    <div className="book-review">
      {/* Reuse QuizFeed's header-container layout verbatim */}
      <div className="header-container">
        <button className="home-icon" onClick={handleBack} aria-label="Go back">
          ← Back
        </button>

        <div className="progress-display">
          {currentIndex + 1} / {session.length}
        </div>

        <div className="audio-controls-group">
          {answerState.selectedChoice !== null && (
            <button
              className="reinforcement-audio-button-header"
              onClick={handleReinforcementAudio}
              disabled={isPlayingReinforcement}
              aria-label="Play reinforcement audio"
            >
              🔊
            </button>
          )}
          <label className="toggle-switch" aria-label="Audio on correct">
            <input
              type="checkbox"
              checked={audioOnCorrect}
              onChange={(e) => setAudioOnCorrect(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <QuizCard
        key={`${currentCard.id}-${currentIndex}`}
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isDisabled={false}
        nextButtonText="Next →"
        isSpeedrunMode={false}
      />
    </div>
  );
}
