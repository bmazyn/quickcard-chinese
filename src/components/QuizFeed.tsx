import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QuizCard from "./QuizCard";
import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import { getDeckIdByName } from "../utils/decks";
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
  const location = useLocation();
  
  // Derive selectedDecks from location state (primary) or localStorage (fallback)
  // This recomputes on every render, ensuring it updates when location changes
  const selectedDecks = useMemo(() => {
    if (location.state?.selectedDecks) {
      return location.state.selectedDecks;
    }
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  }, [location.state?.selectedDecks]);
  
  const [filteredCards, setFilteredCards] = useState<QuizCardType[]>([]);
  const [shuffledDeck, setShuffledDeck] = useState<QuizCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const chapterId = location.state?.chapterId;
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
  const [audioOnCorrect, setAudioOnCorrect] = useState(false);
  const reinforcementTimeoutRef = useRef<number | null>(null);
  const autoReinforcementDelayRef = useRef<number | null>(null);

  // const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize shuffled deck on mount
  useEffect(() => {
    const allCards = quizCardsData as QuizCardType[];
    
    // Check if we're in practice mode (from speedrun)
    const practiceCardIds = localStorage.getItem('qc_practice_cards');
    const practiceSource = localStorage.getItem('qc_practice_source');
    
    let filtered: QuizCardType[];
    
    if (practiceCardIds && practiceSource === 'speedrun') {
      // Practice mode: load only the specified cards
      const ids = JSON.parse(practiceCardIds) as string[];
      filtered = allCards.filter(card => ids.includes(card.id));
    } else {
      // Normal mode: filter by selected decks (selectedDecks contains deck names)
      const selectedDeckIds = selectedDecks
        .map((deckName: string) => getDeckIdByName(deckName))
        .filter((id: string | undefined): id is string => id !== undefined);
      
      filtered = allCards.filter(card => {
        const isValidKind = card.kind === 'vocab' || card.kind === 'sentence' || card.kind === 'phrase';
        // Filter by deckId
        return isValidKind && selectedDeckIds.includes(card.deckId);
      });
    }
    
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
    
    // Auto-play reinforcement audio based on answer correctness and toggle state
    const practiceSource = localStorage.getItem('qc_practice_source');
    if (practiceSource !== 'speedrun') {
      const shouldPlayAudio = !isCorrect || audioOnCorrect;
      if (shouldPlayAudio) {
        autoReinforcementDelayRef.current = window.setTimeout(() => {
          playReinforcementForCard(currentCard);
        }, 400);
      }
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
    
    // Cancel pending automatic reinforcement audio if user advances early
    if (autoReinforcementDelayRef.current !== null) {
      clearTimeout(autoReinforcementDelayRef.current);
      autoReinforcementDelayRef.current = null;
    }

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

  // Helper to check if string contains Chinese characters
  const hasChinese = (s: string): boolean => {
    return /[\u4e00-\u9fff]/.test(s);
  };

  // Helper to extract hanzi from choice text formatted like "pinyin — 汉字"
  const extractHanziFromChoice = (choiceText: string): string => {
    if (choiceText.includes('—')) {
      return choiceText.split('—')[1].trim();
    }
    // Fallback: extract first Chinese substring match
    const match = choiceText.match(/[\u4e00-\u9fff]+/);
    return match ? match[0] : '';
  };

  // Core reinforcement audio playback logic
  const playReinforcementForCard = (card: QuizCardType) => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingReinforcement) return;
    
    if (reinforcementTimeoutRef.current !== null) {
      clearTimeout(reinforcementTimeoutRef.current);
    }
    
    window.speechSynthesis.cancel();
    setIsPlayingReinforcement(true);
    
    const isReverse = card.tags?.includes('reverse') || !hasChinese(card.promptLine);
    
    if (isReverse) {
      // Reverse card: speak English first, then Chinese hanzi only
      const englishText = card.promptLine;
      const englishUtterance = new SpeechSynthesisUtterance(englishText);
      englishUtterance.lang = 'en-US';
      englishUtterance.rate = 0.9;
      
      englishUtterance.onend = () => {
        reinforcementTimeoutRef.current = window.setTimeout(() => {
          const choiceText = card.choices[card.correct];
          const hanzi = extractHanziFromChoice(choiceText);
          
          if (hanzi) {
            const chineseUtterance = new SpeechSynthesisUtterance(hanzi);
            chineseUtterance.lang = 'zh-CN';
            chineseUtterance.rate = 0.9;
            
            chineseUtterance.onend = () => {
              setIsPlayingReinforcement(false);
            };
            
            chineseUtterance.onerror = () => {
              setIsPlayingReinforcement(false);
            };
            
            window.speechSynthesis.speak(chineseUtterance);
          } else {
            // No hanzi found, just clear the flag
            setIsPlayingReinforcement(false);
          }
        }, 0);
      };
      
      englishUtterance.onerror = () => {
        setIsPlayingReinforcement(false);
      };
      
      window.speechSynthesis.speak(englishUtterance);
    } else {
      // Normal card: speak Chinese first, then English
      const hanzi = card.promptLine.split(' — ')[1];
      
      const chineseUtterance = new SpeechSynthesisUtterance(hanzi);
      chineseUtterance.lang = 'zh-CN';
      chineseUtterance.rate = 0.9;
      
      chineseUtterance.onend = () => {
        reinforcementTimeoutRef.current = window.setTimeout(() => {
          const englishText = card.choices[card.correct];
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
    }
  };

  const handleReinforcementAudio = () => {
    if (answerState.selectedChoice === null) return; // Only play if answered
    const currentCard = shuffledDeck[currentIndex];
    playReinforcementForCard(currentCard);
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
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {localStorage.getItem('qc_practice_source') === 'speedrun' ? 'Practice Complete!' : '100% Mastered!'}
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            width: '100%'
          }}>
            {localStorage.getItem('qc_practice_source') === 'speedrun' ? (
              <>
                <button
                  onClick={() => {
                    const deck = localStorage.getItem('qc_practice_deck') || '';
                    localStorage.removeItem('qc_practice_cards');
                    localStorage.removeItem('qc_practice_source');
                    localStorage.removeItem('qc_practice_deck');
                    navigate(`/speedrun?deck=${encodeURIComponent(deck)}`);
                  }}
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
                  🔄 Restart Speedrun
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('qc_practice_cards');
                    localStorage.removeItem('qc_practice_source');
                    localStorage.removeItem('qc_practice_section');
                    navigate('/');
                  }}
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
                  ← Home
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(-1)}
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
                  ← Back
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
              </>
            )}
          </div>
        </div>
      )}
      <div className="header-container">
        <button className="home-icon" onClick={() => {
          try {
            navigate(-1);
          } catch {
            if (chapterId) {
              navigate(`/chapter/${chapterId}`);
            } else {
              navigate("/");
            }
          }
        }} aria-label="Go back">
          ← Back
        </button>
        
        <div className="progress-display">
          {currentIndex + 1} / {shuffledDeck.length}
        </div>
        
        <div className="audio-controls-group">
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
          <label className="toggle-switch" aria-label="Audio on correct">
            <input
              type="checkbox"
              checked={audioOnCorrect}
              onChange={(e) => setAudioOnCorrect(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <QuizCard
        key={currentCard.id}
        card={currentCard}
        answerState={answerState}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isDisabled={isReshuffling || showMasteryComplete}
      />
    </div>
  );
}
