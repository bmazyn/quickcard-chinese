import { useState, useEffect } from "react";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import quizCardsData from "../data/quizCards.json";
import { useTheme } from "../hooks/useTheme";
import "./QuizFeed.css";

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuizFeed() {
  const { theme, toggleTheme } = useTheme();
  const [shuffledDeck, setShuffledDeck] = useState<QuizCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>({
    selectedChoice: null,
    isCorrect: null,
  });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    const saved = localStorage.getItem("bestStreak");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalCorrect, setTotalCorrect] = useState(() => {
    const saved = localStorage.getItem("totalCorrect");
    return saved ? parseInt(saved, 10) : 0;
  });

  // const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize shuffled deck on mount
  useEffect(() => {
    const allCards = quizCardsData as QuizCardType[];
    const filteredCards = allCards.filter(card => 
      card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase'
    );
    setShuffledDeck(shuffleArray(filteredCards));
  }, []);

  // Clear timer on unmount
  // useEffect(() => {
  //   return () => {
  //     if (autoAdvanceTimerRef.current !== null) {
  //       clearTimeout(autoAdvanceTimerRef.current);
  //     }
  //   };
  // }, []);

  const handleAnswer = (choice: ChoiceKey) => {
    const currentCard = shuffledDeck[currentIndex];
    const isCorrect = choice === currentCard.correct;

    setAnswerState({
      selectedChoice: choice,
      isCorrect,
    });

    // Update streak
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setTotalCorrect(totalCorrect + 1);
      localStorage.setItem("totalCorrect", (totalCorrect + 1).toString());

      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem("bestStreak", newStreak.toString());
      }
    } else {
      setStreak(0);
    }

    // Auto-advance after 1 second
    // autoAdvanceTimerRef.current = window.setTimeout(() => {
    //   advanceToNext();
    // }, 1000);
  };

  const advanceToNext = () => {
    // Clear any existing timer
    // if (autoAdvanceTimerRef.current !== null) {
    //   clearTimeout(autoAdvanceTimerRef.current);
    //   autoAdvanceTimerRef.current = null;
    // }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // Reshuffle and restart
      const cards = quizCardsData as QuizCardType[];
      setShuffledDeck(shuffleArray(cards));
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }

    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  const handleNext = () => {
    advanceToNext();
  };

  if (shuffledDeck.length === 0) {
    return <div className="quiz-feed loading">Loading cards...</div>;
  }

  const currentCard = shuffledDeck[currentIndex];

  return (
    <div className="quiz-feed">
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Streak</span>
          <span className="stat-value">{streak}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Best</span>
          <span className="stat-value">{bestStreak}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total ✓</span>
          <span className="stat-value">{totalCorrect}</span>
        </div>
      </div>

      <QuizCard
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="progress-indicator">
        {currentIndex + 1} / {shuffledDeck.length}
      </div>
    </div>
  );
}
