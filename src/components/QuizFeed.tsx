import { useState, useEffect, useRef } from "react";
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
  const [filteredCards, setFilteredCards] = useState<QuizCardType[]>([]);
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

  // Track ongoing audio to prevent race conditions
  const audioPlayingRef = useRef(false);

  // const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize shuffled deck on mount
  useEffect(() => {
    const allCards = quizCardsData as QuizCardType[];
    // Add runtime validation: default missing level to HSK1 for backward compatibility
    const cardsWithLevel = allCards.map(card => ({
      ...card,
      level: card.level || "HSK1"
    }));
    const filtered = cardsWithLevel.filter(card => 
      (card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase') &&
      selectedLevels.includes(card.level as HSKLevel)
    );
    setFilteredCards(filtered);
    setShuffledDeck(shuffleArray(filtered));
  }, [selectedLevels]);

  // Centralized audio playback: play current card's Chinese audio whenever visible card changes
  useEffect(() => {
    if (shuffledDeck.length === 0) return;
    if (!('speechSynthesis' in window)) return;

    const currentCard = shuffledDeck[currentIndex];
    const hanzi = currentCard.promptLine.split(' — ')[1];
    if (!hanzi) return;

    // Cancel any previous audio to prevent race conditions
    window.speechSynthesis.cancel();
    audioPlayingRef.current = false;

    // Small delay to ensure cancel completes and to work around iOS quirks
    const timeoutId = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      
      utterance.onstart = () => {
        audioPlayingRef.current = true;
      };
      
      utterance.onend = () => {
        audioPlayingRef.current = false;
      };
      
      utterance.onerror = () => {
        audioPlayingRef.current = false;
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.speechSynthesis.cancel();
      audioPlayingRef.current = false;
    };
  }, [shuffledDeck, currentIndex]);

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
      // Reshuffle and restart with same filtered cards
      setShuffledDeck(shuffleArray(filteredCards));
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
    // Audio will be handled automatically by useEffect when currentIndex changes
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
