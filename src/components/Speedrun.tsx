import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import quizCardsData from "../data/quizCards.json";
import "./Speedrun.css";

// Maximum allowed misses before speedrun is marked as failed
const MAX_SPEEDRUN_MISSES = 10;

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get best time for a section from localStorage
function getBestTime(sectionName: string): number | null {
  try {
    const key = `qc_speedrun_best_seconds:${sectionName}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    // Fail silently if localStorage is unavailable
    return null;
  }
}

// Save best time for a section to localStorage (only if better)
function saveBestTime(sectionName: string, seconds: number): void {
  try {
    const key = `qc_speedrun_best_seconds:${sectionName}`;
    const existing = getBestTime(sectionName);
    
    // Only save if no previous time or if this time is better
    if (existing === null || seconds < existing) {
      localStorage.setItem(key, seconds.toString());
    }
  } catch {
    // Fail silently if localStorage is unavailable
  }
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [missedCards, setMissedCards] = useState<QuizCardType[]>([]);
  const [mode, setMode] = useState<"speedrun" | "review">("speedrun");
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [speedrunFailed, setSpeedrunFailed] = useState(false);
  
  // Track pending advance (waiting for touch release)
  const pendingAdvanceRef = useRef(false);
  const advanceCleanupRef = useRef<(() => void) | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load cards for the section
  useEffect(() => {
    let sectionCards: QuizCardType[] = [];
    
    // Filter cards by section field
    sectionCards = quizCardsData.filter((card) => {
      const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
      return isValidKind && card.section === sectionParam;
    }) as QuizCardType[];
    
    setCards(sectionCards);
    
    // Load best time for this section
    setBestTime(getBestTime(sectionParam));
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

  // Clear focus on card change to prevent stale :focus/:active styles
  useEffect(() => {
    if (!isStarted || shuffledDeck.length === 0 || currentIndex >= shuffledDeck.length) return;
    
    // Remove focus from any active element to prevent style carryover
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [isStarted, shuffledDeck, currentIndex]);

  // Timer: Increment elapsed seconds while speedrun is active (not in review mode)
  useEffect(() => {
    if (!isStarted || isComplete || mode === "review" || speedrunFailed) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isComplete, mode, speedrunFailed]);

  const handleStart = () => {
    const shuffled = shuffleArray(cards);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsComplete(false);
    setElapsedSeconds(0); // Reset timer
    setMissedCards([]); // Reset missed cards
    setMode("speedrun"); // Set to speedrun mode
    setSpeedrunFailed(false); // Reset failed state
    pendingAdvanceRef.current = false; // Reset pending advance
    if (advanceCleanupRef.current) {
      advanceCleanupRef.current();
      advanceCleanupRef.current = null;
    }
    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  const handleAnswer = (choice: ChoiceKey) => {
    // Prevent answering if speedrun has failed or if pending advance
    if (speedrunFailed || pendingAdvanceRef.current) return;
    
    // Immediately blur to clear iOS active state
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    const currentCard = shuffledDeck[currentIndex];
    const isCorrect = choice === currentCard.correct;

    setAnswerState({
      selectedChoice: choice,
      isCorrect,
    });

    // Track missed cards in speedrun mode
    if (!isCorrect && mode === "speedrun") {
      setMissedCards((prev) => {
        // Add only if not already in the missed cards array
        const isAlreadyMissed = prev.some((card) => card.id === currentCard.id);
        if (!isAlreadyMissed) {
          const newMissedCards = [...prev, currentCard];
          
          // Check if misses exceed the limit - HARD FAIL
          if (newMissedCards.length > MAX_SPEEDRUN_MISSES) {
            setSpeedrunFailed(true);
            setIsComplete(true);
            setIsStarted(false);
            setPenaltyCountdown(0);
          }
          
          return newMissedCards;
        }
        return prev;
      });
    }

    // Automatic progression in speedrun mode
    if (mode === "speedrun") {
      // 300ms feedback delay
      setTimeout(() => {
        if (isCorrect) {
          // Correct: wait for touch release before advancing
          pendingAdvanceRef.current = true;
          
          const advanceToNext = () => {
            if (!pendingAdvanceRef.current) return; // Already handled
            
            if (advanceCleanupRef.current) {
              advanceCleanupRef.current();
              advanceCleanupRef.current = null;
            }
            pendingAdvanceRef.current = false;
            
            // Blur active element to clear any focus/active state
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            
            // Advance on next frame to ensure state is cleared
            requestAnimationFrame(() => {
              handleNext();
            });
          };
          
          const handlePointerUp = () => advanceToNext();
          const handlePointerCancel = () => advanceToNext();
          const handleTouchEnd = () => advanceToNext();
          const handleTouchCancel = () => advanceToNext();
          
          // Attach listeners to window to catch all release events
          window.addEventListener('pointerup', handlePointerUp, { once: true });
          window.addEventListener('pointercancel', handlePointerCancel, { once: true });
          window.addEventListener('touchend', handleTouchEnd, { once: true });
          window.addEventListener('touchcancel', handleTouchCancel, { once: true });
          
          // Safety fallback: advance after 600ms even if events don't fire
          const safetyTimeout = setTimeout(() => {
            advanceToNext();
          }, 600);
          
          // Store cleanup function
          advanceCleanupRef.current = () => {
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerCancel);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchCancel);
            clearTimeout(safetyTimeout);
          };
        } else {
          // Wrong: start 3-second countdown
          setPenaltyCountdown(3);
        }
      }, 300);
    }
  };

  const handleNext = () => {
    // Don't advance if speedrun has failed
    if (speedrunFailed) return;
    
    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // End of speedrun or review
      setIsComplete(true);
      setIsStarted(false);
      
      // Save best time only in speedrun mode if not failed
      if (mode === "speedrun" && !speedrunFailed) {
        saveBestTime(sectionParam, elapsedSeconds);
        // Update displayed best time if this was a new best
        const currentBest = getBestTime(sectionParam);
        setBestTime(currentBest);
        
        // Save missed count from this speedrun
        try {
          const missedKey = `qc_speedrun_last_misses:${sectionParam}`;
          localStorage.setItem(missedKey, missedCards.length.toString());
        } catch {
          // Fail silently if localStorage is unavailable
        }
      }
    } else {
      setCurrentIndex(nextIndex);
      setAnswerState({
        selectedChoice: null,
        isCorrect: null,
      });
      setPenaltyCountdown(0); // Clear penalty countdown on next
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
      localStorage.setItem('qc_practice_section', sectionParam);
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

  // Countdown timer effect - ticks down every second and advances after 1
  useEffect(() => {
    if (penaltyCountdown <= 0 || mode !== "speedrun") return;

    const timer = setTimeout(() => {
      if (penaltyCountdown === 1) {
        // After showing 1, advance to next card
        setPenaltyCountdown(0);
        handleNext();
      } else {
        // Continue countdown
        setPenaltyCountdown(penaltyCountdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [penaltyCountdown, mode]);

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
            <div className="complete-icon">{mode === "speedrun" && speedrunFailed ? '⚠️' : '✅'}</div>
            <h3 className="complete-title">
              {mode === "review" ? 'Review Complete!' : speedrunFailed ? 'Speedrun Failed' : 'Section Cleared!'}
            </h3>
            {mode === "speedrun" && speedrunFailed && (
              <p className="failed-message">Too many misses (limit: {MAX_SPEEDRUN_MISSES})</p>
            )}
            {mode === "speedrun" && !speedrunFailed && <p className="complete-time">Time: {formatTime(elapsedSeconds)}</p>}
            {mode === "speedrun" && !speedrunFailed && bestTime !== null && (
              <p className="complete-best">Best: {formatTime(bestTime)}</p>
            )}
            {mode === "speedrun" && !speedrunFailed && bestTime === null && (
              <p className="complete-best">Best: --:--</p>
            )}
            {mode === "speedrun" && !speedrunFailed && missedCards.length > 0 && (
              <p className="missed-count">Missed: {missedCards.length} card{missedCards.length !== 1 ? 's' : ''}</p>
            )}
            <div className="complete-buttons">
              {mode === "speedrun" && speedrunFailed && (
                <>
                  <button className="review-missed-button" onClick={handlePracticeMisses}>
                    🎯 Practice Misses
                  </button>
                  <button className="run-again-button" onClick={handleRunAgain}>
                    🔄 Restart Speedrun
                  </button>
                </>
              )}
              {mode === "speedrun" && !speedrunFailed && missedCards.length > 0 && (
                <button className="review-missed-button" onClick={handleReviewMissed}>
                  📝 Review Missed
                </button>
              )}
              {mode === "speedrun" && !speedrunFailed && (
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
    <div className={`speedrun ${theme}`}>
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
