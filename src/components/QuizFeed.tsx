import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
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
  const [selectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
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

  // Section Mastery tracking
  const [loopIndex, setLoopIndex] = useState(0);
  const [loopMissed, setLoopMissed] = useState(false);
  const [pendingLoopRestart, setPendingLoopRestart] = useState(false);
  const [isReshuffling, setIsReshuffling] = useState(false);
  const [showMasteryComplete, setShowMasteryComplete] = useState(false);
  const currentSectionId = selectedDecks.join(',');

  // Track ongoing audio to prevent race conditions
  const audioPlayingRef = useRef(false);
  
  // Reinforcement audio state
  const [isPlayingReinforcement, setIsPlayingReinforcement] = useState(false);
  const reinforcementTimeoutRef = useRef<number | null>(null);

  // const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize shuffled deck on mount
  useEffect(() => {
    const allCards = quizCardsData as QuizCardType[];
    
    const filtered = allCards.filter(card => {
      const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
      // Filter by deck only
      return isValidKind && card.deck && selectedDecks.includes(card.deck);
    });
    
    setFilteredCards(filtered);
    setShuffledDeck(shuffleArray(filtered));
    setLoopIndex(0);
    setLoopMissed(false);
  }, [selectedDecks]);

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

      // Increment loop progress
      const newLoopIndex = loopIndex + 1;
      setLoopIndex(newLoopIndex);

      // Check if loop completed perfectly
      if (newLoopIndex >= shuffledDeck.length && !loopMissed) {
        // Mark section as mastered
        const masteredSections = JSON.parse(localStorage.getItem("quickcard_mastered_sections") || "{}");
        masteredSections[currentSectionId] = true;
        localStorage.setItem("quickcard_mastered_sections", JSON.stringify(masteredSections));
        
        // Show mastery completion screen (every time, regardless of previous mastery)
        setShowMasteryComplete(true);
      }
    } else {
      setStreak(0);
      // Wrong answer: set flag to restart loop on Next press
      setPendingLoopRestart(true);
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

    // If pending loop restart from wrong answer, reshuffle and restart
    if (pendingLoopRestart) {
      setIsReshuffling(true);
      setPendingLoopRestart(false);
      
      setTimeout(() => {
        setShuffledDeck(shuffleArray(filteredCards));
        setCurrentIndex(0);
        setLoopIndex(0);
        setAnswerState({
          selectedChoice: null,
          isCorrect: null,
        });
        setIsReshuffling(false);
      }, 700);
      return;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= shuffledDeck.length) {
      // Reshuffle and restart with same filtered cards
      setShuffledDeck(shuffleArray(filteredCards));
      setCurrentIndex(0);
      setLoopIndex(0);
      setLoopMissed(false);
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

  const handleContinueMastery = () => {
    setShowMasteryComplete(false);
    setShuffledDeck(shuffleArray(filteredCards));
    setCurrentIndex(0);
    setLoopIndex(0);
    setLoopMissed(false);
    setAnswerState({
      selectedChoice: null,
      isCorrect: null,
    });
  };

  const handleReinforcementAudio = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingReinforcement) return;
    if (answerState.selectedChoice === null) return; // Only play if answered
    
    if (reinforcementTimeoutRef.current !== null) {
      clearTimeout(reinforcementTimeoutRef.current);
    }
    
    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);
    
    const currentCard = shuffledDeck[currentIndex];
    const hanzi = currentCard.promptLine.split(' — ')[1];
    
    const chineseUtterance = new SpeechSynthesisUtterance(hanzi);
    chineseUtterance.lang = 'zh-CN';
    chineseUtterance.rate = 0.9;
    
    chineseUtterance.onend = () => {
      reinforcementTimeoutRef.current = window.setTimeout(() => {
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

  if (shuffledDeck.length === 0) {
    return <div className="quiz-feed loading">Loading cards...</div>;
  }

  const currentCard = shuffledDeck[currentIndex];

  return (
    <div className="quiz-feed">
      {isReshuffling && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-card)',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '1.125rem',
          fontWeight: 500,
          color: 'var(--text-primary)'
        }}>
          <span style={{ fontSize: '1.5rem' }}>🔀</span>
          <span>Reshuffling…</span>
        </div>
      )}
      {showMasteryComplete && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-card)',
          padding: '32px 40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          minWidth: '280px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>100% Mastered!</div>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            width: '100%'
          }}>
            <button
              onClick={() => navigate("/")}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-hover)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Back to Home
            </button>
            <button
              onClick={handleContinueMastery}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'white',
                backgroundColor: 'var(--accent-color)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Continue
            </button>
          </div>
        </div>
      )}
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
            <span className="stat-label">Loop</span>
            <span className="stat-value">{Math.floor(100 * loopIndex / shuffledDeck.length)}%</span>
          </div>
        </div>
        
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
      </div>

      <QuizCard
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isDisabled={isReshuffling || showMasteryComplete}
      />

      <div className="progress-indicator">
        {currentIndex + 1} / {shuffledDeck.length}
      </div>
    </div>
  );
}
