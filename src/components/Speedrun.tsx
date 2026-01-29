import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckIdByName } from "../utils/decks";
import "./Speedrun.css";

// Penalty for wrong answers in speedrun
const PENALTY_SECONDS = 3;

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get best time for a deck from localStorage
function getDeckBestTime(deckName: string): number | null {
  try {
    const key = `qc_deck_speedrun_best:${deckName}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

// Save best time for a deck to localStorage (only if better)
function saveDeckBestTime(deckName: string, seconds: number): void {
  try {
    const key = `qc_deck_speedrun_best:${deckName}`;
    const existing = getDeckBestTime(deckName);
    
    // Only save if no previous time or if this time is better
    if (existing === null || seconds < existing) {
      localStorage.setItem(key, seconds.toString());
    }
  } catch {
    // Fail silently
  }
}

export default function Speedrun() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deckParam = searchParams.get("deck") || "";

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalPenalties, setTotalPenalties] = useState(0);
  const [missedCards, setMissedCards] = useState<QuizCardType[]>([]);
  const [mode, setMode] = useState<"speedrun" | "review">("speedrun");
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);

  // Format time as mm:ss (always round up fractional seconds)
  const formatTime = (seconds: number): string => {
    const roundedSeconds = Math.ceil(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load cards for the deck
  useEffect(() => {
    let deckCards: QuizCardType[] = [];
    
    // Filter cards by deckId (deckParam contains deck name)
    const deckId = getDeckIdByName(deckParam);
    if (deckId) {
      deckCards = quizCardsData.filter((card) => {
        const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
        return isValidKind && card.deckId === deckId;
      }) as QuizCardType[];
    }
    
    setCards(deckCards);
    
    // Load best time for this deck
    setBestTime(getDeckBestTime(deckParam));
  }, [deckParam]);

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

  // Timer: Track elapsed time with millisecond precision
  useEffect(() => {
    if (!isStarted || isComplete || mode === "review") return;

    const interval = setInterval(() => {
      if (startTime !== null) {
        const elapsed = (Date.now() - startTime) / 1000; // Convert ms to seconds
        setElapsedSeconds(elapsed);
      }
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(interval);
  }, [isStarted, isComplete, mode, startTime]);

  const handleStart = () => {
    const shuffled = shuffleArray(cards);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsComplete(false);
    setElapsedSeconds(0);
    setStartTime(Date.now());
    setTotalPenalties(0);
    setMissedCards([]);
    setMode("speedrun");
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

    // Track missed cards in speedrun mode
    if (!isCorrect && mode === "speedrun") {
      setMissedCards((prev) => {
        const isAlreadyMissed = prev.some((card) => card.id === currentCard.id);
        if (!isAlreadyMissed) {
          return [...prev, currentCard];
        }
        return prev;
      });
    }

    // Automatic progression in speedrun mode
    if (mode === "speedrun") {
      // 300ms feedback delay
      setTimeout(() => {
        if (isCorrect) {
          // Correct: advance immediately
          handleNext();
        } else {
          // Wrong: add penalty and start countdown
          setTotalPenalties((prev) => prev + PENALTY_SECONDS);
          setPenaltyCountdown(PENALTY_SECONDS);
        }
      }, 300);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // End of speedrun or review
      setIsComplete(true);
      setIsStarted(false);
      
      // Save best time only in speedrun mode (elapsed + penalties, always round up)
      if (mode === "speedrun") {
        const finalTime = Math.ceil(elapsedSeconds) + totalPenalties;
        saveDeckBestTime(deckParam, finalTime);
        // Update displayed best time if this was a new best
        const currentBest = getDeckBestTime(deckParam);
        setBestTime(currentBest);
      }
    } else {
      setCurrentIndex(nextIndex);
      setAnswerState({
        selectedChoice: null,
        isCorrect: null,
      });
      setPenaltyCountdown(0);
    }
  };

  const handleRunAgain = () => {
    handleStart();
  };

  const handleBackToHome = () => {
    window.speechSynthesis?.cancel();
    setPenaltyCountdown(0); // Clear penalty countdown
    navigate("/");
  };

  const handleReviewMissed = () => {
    const shuffled = shuffleArray(missedCards);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsComplete(false);
    setMode("review");
    setPenaltyCountdown(0); // Clear any penalties
    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  const handlePracticeMisses = () => {
    // Store missed cards temporarily in localStorage for QuizFeed
    try {
      const missedIds = missedCards.map(card => card.id);
      localStorage.setItem('qc_practice_cards', JSON.stringify(missedIds));
      localStorage.setItem('qc_practice_source', 'speedrun');
      localStorage.setItem('qc_practice_deck', deckParam);
    } catch {
      // Fail silently
    }
    // Navigate to quiz feed
    navigate('/quiz');
  };

  const handleReinforcementAudio = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingReinforcement) return;
    if (answerState.selectedChoice === null) return;
    
    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);
    
    const currentCard = shuffledDeck[currentIndex];
    const hanzi = currentCard.promptLine.split(' — ')[1];
    
    const chineseUtterance = new SpeechSynthesisUtterance(hanzi);
    chineseUtterance.lang = 'zh-CN';
    chineseUtterance.rate = 0.9;
    
    chineseUtterance.onend = () => {
      setTimeout(() => {
        const englishText = currentCard.choices[currentCard.correct];
        const englishUtterance = new SpeechSynthesisUtterance(englishText);
        englishUtterance.lang = 'en-US';
        englishUtterance.rate = 0.9;
        
        englishUtterance.onend = () => {
          setIsPlayingReinforcement(false);
        };
        
        englishUtterance.onerror = () => {
          setIsPlayingReinforcement(false);
        };
        
        window.speechSynthesis.speak(englishUtterance);
      }, 0);
    };
    
    chineseUtterance.onerror = () => {
      setIsPlayingReinforcement(false);
    };
    
    window.speechSynthesis.speak(chineseUtterance);
  };

  // Countdown timer effect - ticks down every second and advances after reaching 0
  useEffect(() => {
    if (penaltyCountdown <= 0 || mode !== "speedrun") return;

    const timer = setTimeout(() => {
      const newCountdown = penaltyCountdown - 1;
      setPenaltyCountdown(newCountdown);
      
      if (newCountdown === 0) {
        // After countdown finishes, advance to next card
        handleNext();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [penaltyCountdown, mode]);

  if (cards.length === 0) {
    return (
      <div className="speedrun">
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Deck Run — {deckParam}</h2>
          </div>
          <p className="no-cards">No cards found for this deck</p>
        </div>
      </div>
    );
  }

  // Pre-run screen
  if (!isStarted && !isComplete) {
    return (
      <div className="speedrun">
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Deck Run — {deckParam}</h2>
          </div>

          <div className="speedrun-prerun">
            <div className="speedrun-info">
              <div className="info-card">
                <div className="info-icon">🏃</div>
                <div className="info-text">
                  <h3>Ready for Deck Run?</h3>
                  <p>{cards.length} cards • One pass only</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
                    Wrong answer = +3s penalty
                  </p>
                </div>
              </div>
            </div>
            <button className="start-speedrun-button" onClick={handleStart} disabled={cards.length === 0}>
              Start Deck Run
            </button>
          </div>
        </div>
      </div>
    );
  }

  // End screen
  if (isComplete) {
    const finalTime = Math.ceil(elapsedSeconds) + totalPenalties;
    
    return (
      <div className="speedrun">
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>
            <h2 className="speedrun-title">Deck Run — {deckParam}</h2>
          </div>

          <div className="speedrun-complete">
            <div className="complete-icon">{mode === "review" ? '📝' : '✅'}</div>
            <h3 className="complete-title">
              {mode === "review" ? 'Review Complete!' : 'Deck Cleared!'}
            </h3>
            {mode === "speedrun" && (
              <>
                <p className="complete-time">
                  Time: {formatTime(finalTime)}
                  {totalPenalties > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      ({formatTime(Math.ceil(elapsedSeconds))} + {totalPenalties}s)
                    </span>
                  )}
                </p>
                {bestTime !== null && (
                  <p className="complete-best">Best: {formatTime(bestTime)}</p>
                )}
                {bestTime === null && (
                  <p className="complete-best">Best: --:--</p>
                )}
                {missedCards.length > 0 && (
                  <p className="missed-count">Missed: {missedCards.length} card{missedCards.length !== 1 ? 's' : ''}</p>
                )}
              </>
            )}
            <div className="complete-buttons">
              {mode === "speedrun" && missedCards.length > 0 && (
                <button className="review-missed-button" onClick={handleReviewMissed}>
                  📝 Review Missed
                </button>
              )}
              {mode === "speedrun" && missedCards.length > 0 && (
                <button className="review-missed-button" onClick={handlePracticeMisses}>
                  🎯 Practice Misses
                </button>
              )}
              {mode === "speedrun" && (
                <button className="run-again-button" onClick={handleRunAgain}>
                  🔄 Run Again
                </button>
              )}
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
  const isPenaltyActive = mode === "speedrun" && penaltyCountdown > 0;
  const nextButtonText = isPenaltyActive ? `Next (${penaltyCountdown})` : "Next →";

  return (
    <div className="speedrun">
      <div className="speedrun-header">
        <button className="home-icon" onClick={handleBackToHome} aria-label="Go to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        
        <div className="speedrun-stats">
          {mode === "speedrun" && (
            <div className="stat">
              <span className="stat-label">Time</span>
              <span className="stat-value">{formatTime(elapsedSeconds)}</span>
            </div>
          )}
          {mode === "review" && (
            <div className="stat">
              <span className="stat-label">Review</span>
              <span className="stat-value">📝</span>
            </div>
          )}
          <div className="stat">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{currentIndex + 1} / {shuffledDeck.length}</span>
          </div>
        </div>

        {mode === "review" && answerState.selectedChoice !== null && (
          <button 
            className="reinforcement-audio-button-header"
            onClick={handleReinforcementAudio}
            disabled={isPlayingReinforcement}
            aria-label="Play reinforcement audio"
          >
            🔊
          </button>
        )}
      </div>

      <QuizCard
        key={`${currentCard.id}-${currentIndex}`}
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isDisabled={isPenaltyActive}
        nextButtonText={nextButtonText}
        isSpeedrunMode={mode === "speedrun"}
        countdownNumber={penaltyCountdown > 0 ? penaltyCountdown : null}
      />
    </div>
  );
}
