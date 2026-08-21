import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { AnswerState, ChoiceKey, QuizCard as QuizCardType } from "../types";
import {
  CHAPTER_REVIEW_MAX_STREAK,
  getChapterReviewBestStreak,
  getEligibleCardsForChapter,
  saveChapterReviewBestStreak,
} from "../utils/chapterReview";
import "./BookReview.css";
import "./QuizFeed.css";

function buildStreakQueue(cards: QuizCardType[]): QuizCardType[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, CHAPTER_REVIEW_MAX_STREAK);
}

function getMissedCardText(card: QuizCardType) {
  const [pinyin = "", ...hanziParts] = card.promptLine.split("—");
  return {
    pinyin: pinyin.trim(),
    hanzi: hanziParts.join("—").trim(),
    english: card.choices[card.correct].trim(),
  };
}

export default function ChapterReviewStreak() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const chapter = Number(chapterId);
  const eligibleCards = useMemo(
    () =>
      getEligibleCardsForChapter(chapter).filter(
        (card) => !card.tags.includes("reverse")
      ),
    [chapter]
  );

  const [streakQueue, setStreakQueue] = useState<QuizCardType[]>(() =>
    buildStreakQueue(eligibleCards)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentCard = streakQueue[currentIndex] ?? null;
  const runMax = streakQueue.length;
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() =>
    getChapterReviewBestStreak(chapter)
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isPerfect, setIsPerfect] = useState(false);
  const [missedCard, setMissedCard] = useState<QuizCardType | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>({
    selectedChoice: null,
    isCorrect: null,
  });
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const reinforcementTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentCard || isComplete || answerState.selectedChoice !== null) return;
    if (!("speechSynthesis" in window)) return;
    const hanzi = currentCard.promptLine.split(" — ")[1];
    if (!hanzi) return;

    window.speechSynthesis.cancel();
    const timeout = window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = "zh-CN";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }, 100);

    return () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.cancel();
    };
  }, [currentCard, isComplete, answerState.selectedChoice]);

  useEffect(() => {
    return () => {
      if (reinforcementTimeoutRef.current !== null) {
        window.clearTimeout(reinforcementTimeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const playReinforcementForCard = (card: QuizCardType) => {
    if (!("speechSynthesis" in window) || isPlayingReinforcement) return;
    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);

    const hanzi = card.promptLine.split(" — ")[1];
    const chinese = new SpeechSynthesisUtterance(hanzi);
    chinese.lang = "zh-CN";
    chinese.rate = 0.9;
    chinese.onend = () => {
      const english = new SpeechSynthesisUtterance(card.choices[card.correct]);
      english.lang = "en-US";
      english.rate = 0.9;
      english.onend = () => setIsPlayingReinforcement(false);
      english.onerror = () => setIsPlayingReinforcement(false);
      window.speechSynthesis.speak(english);
    };
    chinese.onerror = () => setIsPlayingReinforcement(false);
    window.speechSynthesis.speak(chinese);
  };

  const finishRun = (streak: number, perfect: boolean) => {
    setBestStreak(saveChapterReviewBestStreak(chapter, streak));
    setIsPerfect(perfect);
    setIsComplete(true);
  };

  const handleAnswer = (choice: ChoiceKey) => {
    if (!currentCard) return;
    const correct = choice === currentCard.correct;
    setAnswerState({ selectedChoice: choice, isCorrect: correct });
    reinforcementTimeoutRef.current = window.setTimeout(
      () => playReinforcementForCard(currentCard),
      400
    );

    if (!correct) {
      setMissedCard(currentCard);
      finishRun(currentStreak, false);
      return;
    }

    const nextStreak = currentStreak + 1;
    setCurrentStreak(nextStreak);
    if (nextStreak >= runMax) {
      finishRun(runMax, true);
    }
  };

  const handleNext = () => {
    if (!currentCard || answerState.isCorrect !== true) return;
    setCurrentIndex((index) => index + 1);
    setAnswerState({ selectedChoice: null, isCorrect: null });
  };

  const handleTryAgain = () => {
    if (reinforcementTimeoutRef.current !== null) {
      window.clearTimeout(reinforcementTimeoutRef.current);
      reinforcementTimeoutRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setStreakQueue(buildStreakQueue(eligibleCards));
    setCurrentIndex(0);
    setCurrentStreak(0);
    setMissedCard(null);
    setAnswerState({ selectedChoice: null, isCorrect: null });
    setIsPlayingReinforcement(false);
    setIsPerfect(false);
    setIsComplete(false);
  };

  const handleBack = () => {
    if (reinforcementTimeoutRef.current !== null) {
      window.clearTimeout(reinforcementTimeoutRef.current);
      reinforcementTimeoutRef.current = null;
    }
    window.speechSynthesis?.cancel();
    navigate("/chapter-review");
  };

  if (!currentCard) {
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack}>← Back</button>
            <h2 className="book-review-title">Chapter {chapter} Streak Mode</h2>
          </div>
          <p className="book-review-no-cards">No cards found for this chapter.</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const missedText = missedCard ? getMissedCardText(missedCard) : null;
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack}>← Back</button>
            <h2 className="book-review-title">Chapter {chapter} Streak Mode</h2>
          </div>

          <div className="book-review-complete">
            {isPerfect && <div className="book-review-complete-icon">🏆</div>}
            <h3 className="book-review-complete-title">
              {isPerfect ? `Perfect Streak: ${runMax}` : "Streak Ended"}
            </h3>

            <div className="book-review-stats-table">
              <div className="book-review-stat-row">
                <span className="book-review-stat-label">Final streak</span>
                <span className="book-review-stat-value">{currentStreak}</span>
              </div>
              <div className="book-review-stat-row">
                <span className="book-review-stat-label">Best streak</span>
                <span className="book-review-stat-value">{bestStreak}</span>
              </div>
            </div>

            <div className="book-review-complete-btns">
              <button className="book-review-again-btn" onClick={handleTryAgain}>Try Again</button>
              <button className="book-review-done-btn" onClick={handleBack}>Back to Chapter Review</button>
            </div>

            {missedText && (
              <section className="book-review-missed" aria-labelledby="streak-missed-title">
                <h4 id="streak-missed-title">Missed This Round</h4>
                <div className="book-review-missed-list">
                  <div className="book-review-missed-item">
                    <div className="book-review-missed-chinese">
                      <span className="book-review-missed-pinyin">{missedText.pinyin}</span>
                      <span className="book-review-missed-hanzi">{missedText.hanzi}</span>
                    </div>
                    <div className="book-review-missed-english">{missedText.english}</div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="book-review">
      <div className="header-container">
        <button className="home-icon" onClick={handleBack} aria-label="Back to Chapter Review">
          ← Back
        </button>
        <div className="progress-display">🔥 {currentStreak}</div>
        <div className="audio-controls-group">
          {answerState.selectedChoice !== null && (
            <button
              className="reinforcement-audio-button-header"
              onClick={() => playReinforcementForCard(currentCard)}
              disabled={isPlayingReinforcement}
              aria-label="Play reinforcement audio"
            >
              🔊
            </button>
          )}
        </div>
      </div>

      <QuizCard
        key={currentCard.id}
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        nextButtonText="Continue →"
      />
    </div>
  );
}
