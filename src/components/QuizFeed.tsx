import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState, HSKLevel } from "../types";
// Single source of truth for all quiz content - DO NOT modify or supplement
import quizCardsData from "../data/quizCards.json";
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
  const navigate = useNavigate();
  const [selectedLevels] = useState<HSKLevel[]>(() => {
    const saved = localStorage.getItem("selectedLevels");
    return saved ? JSON.parse(saved) : ["HSK1"];
  });
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
    // Add runtime validation: default missing level to HSK1 for backward compatibility
    const cardsWithLevel = allCards.map(card => ({
      ...card,
      level: card.level || "HSK1"
    }));
    const filteredCards = cardsWithLevel.filter(card => 
      (card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase') &&
      selectedLevels.includes(card.level as HSKLevel)
    );
    setShuffledDeck(shuffleArray(filteredCards));
  }, [selectedLevels]);

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
    // Calculate next card's hanzi for pronunciation
    const nextIndex = currentIndex + 1;
    let nextCard: QuizCardType | null = null;
    
    if (nextIndex >= shuffledDeck.length) {
      // Will reshuffle - get first card of reshuffled deck
      const cards = quizCardsData as QuizCardType[];
      const filteredCards = cards.filter(card => 
        card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase'
      );
      if (filteredCards.length > 0) {
        nextCard = filteredCards[0]; // Approximate - actual shuffle happens in advanceToNext
      }
    } else {
      nextCard = shuffledDeck[nextIndex];
    }
    
    // Pronounce immediately within tap handler (iPhone Safari requirement)
    if (nextCard && 'speechSynthesis' in window) {
      const hanzi = nextCard.promptLine.split(' — ')[1];
      if (hanzi) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(hanzi);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }
    
    // Advance immediately
    advanceToNext();
  };

  if (shuffledDeck.length === 0) {
    return <div className="quiz-feed loading">Loading cards...</div>;
  }

  const currentCard = shuffledDeck[currentIndex];

  return (
    <div className="quiz-feed">
      <div className="header-container">
        <button className="home-icon" onClick={() => navigate("/")} aria-label="Go to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
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
      </div>

      <QuizCard
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />

      <div className="progress-indicator">
        {currentIndex + 1} / {shuffledDeck.length}
      </div>
    </div>
  );
}
