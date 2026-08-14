import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { AnswerState, ChoiceKey, QuizCard as QuizCardType } from "../types";
import {
  buildChapterReviewSession,
  CHAPTER_REVIEW_TOP_SCORE_COUNT,
  getChapterReviewTopScores,
  saveChapterReviewScore,
} from "../utils/chapterReview";
import { getDeckEntriesForChapter } from "../utils/decks";
import "./BookReview.css";
import "./QuizFeed.css";

function getMissedCardText(card: QuizCardType) {
  const correctChoice = card.choices[card.correct];
  const promptHasChineseSide = card.promptLine.includes("—");
  const chineseSide = promptHasChineseSide ? card.promptLine : correctChoice;
  const english = promptHasChineseSide ? correctChoice : card.promptLine;
  const [pinyin = "", ...hanziParts] = chineseSide.split("—");

  return {
    pinyin: pinyin.trim(),
    hanzi: hanziParts.join("—").trim(),
    english: english.trim(),
  };
}

export default function ChapterReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { chapterId } = useParams<{ chapterId: string }>();
  const chapter = Number(chapterId);
  const isNoPinyin = searchParams.get("mode") === "no-pinyin";
  const book = getDeckEntriesForChapter(chapter).find(
    (deck) => deck.book !== undefined
  )?.book;

  const [session, setSession] = useState<QuizCardType[]>(() =>
    buildChapterReviewSession(chapter, isNoPinyin)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedCards, setMissedCards] = useState<QuizCardType[]>([]);
  const [topScores, setTopScores] = useState<number[]>(() =>
    getChapterReviewTopScores(chapter, isNoPinyin)
  );
  const [answerState, setAnswerState] = useState<AnswerState>({
    selectedChoice: null,
    isCorrect: null,
  });
  const [audioOnCorrect, setAudioOnCorrect] = useState(true);
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const reinforcementTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (session.length === 0 || currentIndex >= session.length || isComplete) return;
    if (answerState.selectedChoice !== null || !("speechSynthesis" in window)) return;

    const hanzi = session[currentIndex].promptLine.split(" — ")[1];
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
  }, [session, currentIndex, answerState.selectedChoice, isComplete]);

  useEffect(() => {
    return () => {
      if (reinforcementTimeoutRef.current !== null) {
        window.clearTimeout(reinforcementTimeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const hasChinese = (text: string) => /[\u4e00-\u9fff]/.test(text);

  const extractHanziFromChoice = (choiceText: string): string => {
    if (choiceText.includes("—")) return choiceText.split("—")[1].trim();
    return choiceText.match(/[\u4e00-\u9fff]+/)?.[0] ?? "";
  };

  const playReinforcementForCard = (card: QuizCardType) => {
    if (!("speechSynthesis" in window) || isPlayingReinforcement) return;
    if (reinforcementTimeoutRef.current !== null) {
      window.clearTimeout(reinforcementTimeoutRef.current);
    }

    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);
    const isReverse = card.tags?.includes("reverse") || !hasChinese(card.promptLine);

    if (isReverse) {
      const english = new SpeechSynthesisUtterance(card.promptLine);
      english.lang = "en-US";
      english.rate = 0.9;
      english.onend = () => {
        const hanzi = extractHanziFromChoice(card.choices[card.correct]);
        if (!hanzi) {
          setIsPlayingReinforcement(false);
          return;
        }
        const chinese = new SpeechSynthesisUtterance(hanzi);
        chinese.lang = "zh-CN";
        chinese.rate = 0.9;
        chinese.onend = () => setIsPlayingReinforcement(false);
        chinese.onerror = () => setIsPlayingReinforcement(false);
        window.speechSynthesis.speak(chinese);
      };
      english.onerror = () => setIsPlayingReinforcement(false);
      window.speechSynthesis.speak(english);
      return;
    }

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

  const handleAnswer = (choice: ChoiceKey) => {
    const currentCard = session[currentIndex];
    const isCorrect = choice === currentCard.correct;
    setAnswerState({ selectedChoice: choice, isCorrect });

    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    } else {
      setMissedCards((cards) => [...cards, currentCard]);
    }

    if (!isCorrect || audioOnCorrect) {
      window.setTimeout(() => playReinforcementForCard(currentCard), 400);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= session.length) {
      setTopScores(saveChapterReviewScore(chapter, correctCount, isNoPinyin));
      setIsComplete(true);
      return;
    }
    setCurrentIndex(nextIndex);
    setAnswerState({ selectedChoice: null, isCorrect: null });
  };

  const handleNewSession = () => {
    setSession(buildChapterReviewSession(chapter, isNoPinyin));
    setCurrentIndex(0);
    setCorrectCount(0);
    setMissedCards([]);
    setAnswerState({ selectedChoice: null, isCorrect: null });
    setIsComplete(false);
  };

  const handleBack = () => {
    window.speechSynthesis?.cancel();
    navigate("/chapter-review");
  };

  if (session.length === 0) {
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack}>← Back</button>
            <h2 className="book-review-title">Chapter Review</h2>
          </div>
          <p className="book-review-no-cards">No cards found for this chapter.</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const isPerfect = correctCount === session.length;
    return (
      <div className="book-review">
        <div className="book-review-content">
          <div className="book-review-header">
            <button className="book-review-back-btn" onClick={handleBack}>← Back</button>
            <h2 className="book-review-title">
              Book {book} — Chapter {chapter} {isNoPinyin ? "No Pinyin " : ""}Review
            </h2>
          </div>

          <div className="book-review-complete">
            {isPerfect && <div className="book-review-complete-icon">🏆</div>}
            <h3 className="book-review-complete-title">
              {isPerfect ? "Perfect Clear!" : "Session Complete!"}
            </h3>

            <div className="book-review-stats-table">
              <div className="book-review-stat-row">
                <span className="book-review-stat-label">Score</span>
                <span className="book-review-stat-value">{correctCount}</span>
              </div>
              <div className="book-review-stat-row book-review-top10-row">
                <span className="book-review-stat-label">Best scores</span>
                <span className="book-review-top10-slots">
                  {Array.from({ length: CHAPTER_REVIEW_TOP_SCORE_COUNT }).map((_, index) => {
                    const score = topScores[index];
                    if (score === undefined) {
                      return <span key={index} className="br-slot br-slot--empty" />;
                    }
                    return <span key={index} className="br-slot br-slot--score">{score}</span>;
                  })}
                </span>
              </div>
            </div>

            <div className="book-review-complete-btns">
              <button className="book-review-again-btn" onClick={handleNewSession}>
                🔄 New Session
              </button>
              <button className="book-review-done-btn" onClick={handleBack}>
                ← Back to Chapters
              </button>
            </div>

            {missedCards.length > 0 && (
              <section className="book-review-missed" aria-labelledby="chapter-review-missed-title">
                <h4 id="chapter-review-missed-title">Missed This Round</h4>
                <div className="book-review-missed-list">
                  {missedCards.map((card) => {
                    const text = getMissedCardText(card);
                    return (
                      <div key={card.id} className="book-review-missed-item">
                        <div className="book-review-missed-chinese">
                          <span className="book-review-missed-pinyin">{text.pinyin}</span>
                          <span className="book-review-missed-hanzi">{text.hanzi}</span>
                        </div>
                        <div className="book-review-missed-english">{text.english}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentCard = session[currentIndex];
  return (
    <div className="book-review">
      <div className="header-container">
        <button className="home-icon" onClick={handleBack} aria-label="Back to Chapter Review">
          ← Back
        </button>
        <div className="progress-display">Question {currentIndex + 1}</div>
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
          <label className="toggle-switch" aria-label="Audio on correct">
            <input
              type="checkbox"
              checked={audioOnCorrect}
              onChange={(event) => setAudioOnCorrect(event.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <QuizCard
        key={`${currentCard.id}-${currentIndex}`}
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        nextButtonText="Next →"
        hidePinyin={isNoPinyin}
        hanziFocusMode={isNoPinyin}
      />
    </div>
  );
}
