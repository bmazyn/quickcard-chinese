import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckIdByName } from "../utils/decks";
import "./Speedrun.css";
// comment for speedrun review issue

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
    
    // Only save if no previous time or if this time is better (time is in seconds)
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
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
      if (isCorrect) {
        // Correct: advance after brief feedback (300ms)
        setTimeout(() => {
          handleNext();
        }, 300);
      } else {
        // Wrong: Show correct answer for 2 seconds, then reinsert card
        setTimeout(() => {
          // Reinsert the missed card at a random position in the second half of remaining deck
          const remaining = shuffledDeck.slice(currentIndex + 1);
          if (remaining.length > 0) {
            // Calculate second half range
            const secondHalfStart = Math.ceil(remaining.length / 2);
            const insertIndex = secondHalfStart + Math.floor(Math.random() * (remaining.length - secondHalfStart));
            
            // Insert card at random position in second half
            const newDeck = [
              ...shuffledDeck.slice(0, currentIndex + 1),
              ...remaining.slice(0, insertIndex),
              currentCard,
              ...remaining.slice(insertIndex)
            ];
            setShuffledDeck(newDeck);
          }
          
          // Advance to next card
          handleNext();
        }, 2000);
      }
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // End of speedrun or review
      setIsComplete(true);
      setIsStarted(false);
      
      // Save best time only in speedrun mode (elapsed time, always round up)
      if (mode === "speedrun") {
        const finalTime = Math.ceil(elapsedSeconds);
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
    }
  };

  const handleRunAgain = () => {
    handleStart();
  };

  const handleBackToHome = () => {
    window.speechSynthesis?.cancel();
    navigate(-1);
  };

  const handleReviewMissed = () => {
    const shuffled = shuffleArray(missedCards);
    setShuffledDeck(shuffled);
    setCurrentIndex(0);
    setIsStarted(true);
    setIsComplete(false);
    setMode("review");
    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  /*const handlePracticeMisses = () => {
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
  };*/

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

  if (cards.length === 0) {
    return (
      <div className="speedrun">
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go back">
              ← Back
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
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go back">
              ← Back
            </button>
            <h2 className="speedrun-title">Deck Run — {deckParam}</h2>
          </div>

          <div className="speedrun-prerun">
            <div className="speedrun-info">
              <div className="info-card">
                <div className="info-icon">🏃</div>
                <div className="info-text">
                  <h3>Ready for Deck Run?</h3>
                  <p>{cards.length} cards • Clear all to finish</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
                    Missed cards return to the queue
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
    const finalTime = Math.ceil(elapsedSeconds);
    
    return (
      <div className="speedrun">
        <div className="speedrun-content">
          <div className="speedrun-header">
            <button className="home-icon" onClick={handleBackToHome} aria-label="Go back">
              ← Back
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
{/*               {mode === "speedrun" && missedCards.length > 0 && (
                <button className="review-missed-button" onClick={handlePracticeMisses}>
                  🎯 Practice Misses
                </button>
              )} */}
              {mode === "speedrun" && (
                <button className="run-again-button" onClick={handleRunAgain}>
                  🔄 Run Again
                </button>
              )}
              <button className="back-home-button" onClick={handleBackToHome}>
                ← Back
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

  return (
    <div className="speedrun">
      <div className="speedrun-header">
        <button className="home-icon" onClick={handleBackToHome} aria-label="Go back">
          ← Back
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
        isDisabled={false}
        nextButtonText="Next →"
        isSpeedrunMode={mode === "speedrun"}
      />
    </div>
  );
}
