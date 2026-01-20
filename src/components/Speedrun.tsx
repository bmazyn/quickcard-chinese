import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import quizCardsData from "../data/quizCards.json";
import "./Speedrun.css";

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Speedrun() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section") || "";

  const [cards, setCards] = useState<QuizCardType[]>([]);
  const [shuffledDeck, setShuffledDeck] = useState<QuizCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>({
    selectedChoice: null,
    isCorrect: null,
  });
  const [penaltyCountdown, setPenaltyCountdown] = useState(0);

  // Load cards for the section
  useEffect(() => {
    let sectionCards: QuizCardType[] = [];
    
    if (sectionParam === "Foundation") {
      // Load all Foundation decks
      const foundationDecks = ["Foundation 1", "Numbers", "Time 1", "Greetings 1"];
      sectionCards = quizCardsData.filter((card) => {
        const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
        return isValidKind && foundationDecks.includes(card.deck || "");
      }) as QuizCardType[];
    } else {
      // Load specific deck
      sectionCards = quizCardsData.filter((card) => {
        const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
        return isValidKind && card.deck === sectionParam;
      }) as QuizCardType[];
    }
    
    setCards(sectionCards);
  }, [sectionParam]);

  // Auto-play Chinese audio on card change (sound on next)
  useEffect(() => {
    if (!isStarted || shuffledDeck.length === 0 || currentIndex >= shuffledDeck.length) return;
    if (answerState.selectedChoice !== null) return; // Only play when waiting for answer
    if (!('speechSynthesis' in window)) return;

    const currentCard = shuffledDeck[currentIndex];
    const hanzi = currentCard.promptLine.split(' — ')[1];
    if (!hanzi) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(hanzi);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isStarted, shuffledDeck, currentIndex, answerState.selectedChoice]);

  const handleStart = () => {
    const shuffled = shuffleArray(cards);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsComplete(false);
    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  const handleAnswer = (choice: ChoiceKey) => {
    const currentCard = shuffledDeck[currentIndex];
    const isCorrect = choice === currentCard.correct;

    setAnswerState({
      selectedChoice: choice,
      isCorrect,
    });

    // Miss penalty: start 3-second countdown on wrong answer
    if (!isCorrect) {
      setPenaltyCountdown(3);
      
      // Reinsertion logic: reinsert card at the middle of remaining cards
      const remainingCards = shuffledDeck.length - currentIndex - 1;
      if (remainingCards > 0) {
        const insertPosition = currentIndex + 1 + Math.floor(remainingCards / 2);
        const newDeck = [...shuffledDeck];
        newDeck.splice(insertPosition, 0, currentCard);
        setShuffledDeck(newDeck);
      }
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // End of speedrun
      setIsComplete(true);
      setIsStarted(false);
    } else {
      setCurrentIndex(nextIndex);
      setAnswerState({
        selectedChoice: null,
        isCorrect: null,
      });
      setPenaltyCountdown(0); // Clear penalty countdown on next
    }

    // TODO: Timer tracking - track time from start to finish
    // Placeholder for future implementation
  };

  const handleRunAgain = () => {
    handleStart();
  };

  const handleBackToHome = () => {
    window.speechSynthesis?.cancel();
    setPenaltyCountdown(0); // Clear penalty countdown
    navigate("/");
  };

  // Countdown timer effect - ticks down every second
  useEffect(() => {
    if (penaltyCountdown <= 0) return;

    const timer = setInterval(() => {
      setPenaltyCountdown((prev) => {
        if (prev <= 1) {
          return 0; // Stop at 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [penaltyCountdown]);

  if (cards.length === 0) {
    return (
      <div className={`speedrun ${theme}`}>
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Speedrun — {sectionParam}</h2>
          </div>
          <p className="no-cards">No cards found for this section</p>
        </div>
      </div>
    );
  }

  // Pre-run screen
  if (!isStarted && !isComplete) {
    return (
      <div className={`speedrun ${theme}`}>
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Speedrun — {sectionParam}</h2>
          </div>

          <div className="speedrun-prerun">
            <div className="speedrun-info">
              <div className="info-card">
                <div className="info-icon">🏃</div>
                <div className="info-text">
                  <h3>Ready to Speedrun?</h3>
                  <p>{cards.length} cards in this section</p>
                </div>
              </div>
            </div>
            <button className="start-speedrun-button" onClick={handleStart} disabled={cards.length === 0}>
              Start Speedrun
            </button>
          </div>
        </div>
      </div>
    );
  }

  // End screen
  if (isComplete) {
    return (
      <div className={`speedrun ${theme}`}>
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Speedrun — {sectionParam}</h2>
          </div>

          <div className="speedrun-complete">
            <div className="complete-icon">✅</div>
            <h3 className="complete-title">Section Cleared!</h3>
            <div className="complete-buttons">
              <button className="run-again-button" onClick={handleRunAgain}>
                🔄 Run Again
              </button>
              <button className="back-home-button" onClick={handleBackToHome}>
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz screen
  if (shuffledDeck.length === 0 || currentIndex >= shuffledDeck.length) {
    return null; // Guard against empty deck
  }

  const currentCard = shuffledDeck[currentIndex];
  const isPenaltyActive = penaltyCountdown > 0;
  const nextButtonText = isPenaltyActive ? `Next (${penaltyCountdown})` : "Next →";

  return (
    <div className={`speedrun ${theme}`}>
      <div className="speedrun-header">
        <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
        <div className="speedrun-stats">
          <div className="stat">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{currentIndex + 1} / {shuffledDeck.length}</span>
          </div>
        </div>
      </div>

      <QuizCard
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isDisabled={isPenaltyActive}
        nextButtonText={nextButtonText}
      />
    </div>
  );
}
