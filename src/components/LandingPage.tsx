import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import quizCards from "../data/quizCards.json";
import "./LandingPage.css";

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

// Get section rollup time (sum of all deck best times)
function getSectionRollupTime(decks: string[]): number | null {
  try {
    let total = 0;
    let hasAnyTime = false;
    
    for (const deck of decks) {
      const deckTime = getDeckBestTime(deck);
      if (deckTime !== null) {
        total += deckTime;
        hasAnyTime = true;
      } else {
        // If any deck has no time, section time is incomplete
        return null;
      }
    }
    
    return hasAnyTime ? total : null;
  } catch {
    return null;
  }
}

// Compute sections and decks from quizCards.json
const sections = Array.from(new Set(quizCards.map(card => card.section)));
const decksPerSection: Record<string, string[]> = {};
sections.forEach(section => {
  decksPerSection[section] = Array.from(
    new Set(quizCards.filter(card => card.section === section).map(card => card.deck))
  );
});

export default function LandingPage() {
  const navigate = useNavigate();
  
  // Audio element for iOS Safari autoplay unlock
  const audioUnlockRef = useRef<HTMLAudioElement | null>(null);

  const [selectedDecks, setSelectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  });

  const [masteredSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("quickcard_mastered_sections");
    return saved ? JSON.parse(saved) : {};
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [modalDeck, setModalDeck] = useState<string | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get deck speedrun best time
  const getDeckSpeedrunTime = (deck: string): string => {
    const time = getDeckBestTime(deck);
    return time !== null ? formatTime(time) : "--:--";
  };

  // Get section rollup time
  const getSectionTime = (decks: string[]): string => {
    const time = getSectionRollupTime(decks);
    return time !== null ? formatTime(time) : "--:--";
  };

  useEffect(() => {
    localStorage.setItem("selectedDecks", JSON.stringify(selectedDecks));
  }, [selectedDecks]);

  const handleDeckClick = (deck: string) => {
    if (isMultiSelectMode) {
      // Multi-select mode: toggle selection
      setSelectedDecks(prev => 
        prev.includes(deck)
          ? prev.filter(d => d !== deck)
          : [...prev, deck]
      );
    } else {
      // Single-deck mode: show modal
      setModalDeck(deck);
      setShowDeckModal(true);
    }
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(prev => {
      const newMode = !prev;
      // Clear selections when turning OFF multi-select
      if (!newMode) {
        setSelectedDecks([]);
      }
      return newMode;
    });
  };

  const handleModalAudioLoop = () => {
    if (!modalDeck) return;
    setShowDeckModal(false);
    
    // iOS Safari audio unlock
    if (!audioUnlockRef.current) {
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioUnlockRef.current = new Audio(silentAudio);
    }
    const audio = audioUnlockRef.current;
    audio.currentTime = 0;
    audio.load();
    audio.play().catch(() => {}).finally(() => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    navigate(`/audio-loop?decks=${encodeURIComponent(modalDeck)}`);
  };

  const handleModalQuiz = () => {
    if (!modalDeck) return;
    setShowDeckModal(false);
    
    // Set selected deck and navigate
    localStorage.setItem("selectedDecks", JSON.stringify([modalDeck]));
    
    // iOS Safari audio unlock
    if (!audioUnlockRef.current) {
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioUnlockRef.current = new Audio(silentAudio);
    }
    const audio = audioUnlockRef.current;
    audio.currentTime = 0;
    audio.load();
    audio.play().catch(() => {}).finally(() => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    navigate("/quiz");
  };

  const handleMultiSelectAudioLoop = () => {
    if (selectedDecks.length === 0) return;
    
    // iOS Safari audio unlock
    if (!audioUnlockRef.current) {
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioUnlockRef.current = new Audio(silentAudio);
    }
    const audio = audioUnlockRef.current;
    audio.currentTime = 0;
    audio.load();
    audio.play().catch(() => {}).finally(() => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    navigate(`/audio-loop?decks=${encodeURIComponent(selectedDecks.join(','))}`);
  };

  const handleMultiSelectQuiz = () => {
    if (selectedDecks.length === 0) return;
    
    // iOS Safari audio unlock
    if (!audioUnlockRef.current) {
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioUnlockRef.current = new Audio(silentAudio);
    }
    const audio = audioUnlockRef.current;
    audio.currentTime = 0;
    audio.load();
    audio.play().catch(() => {}).finally(() => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    navigate("/quiz");
  };

  const toggleSectionCollapse = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBackToStart = () => {
    // Clear the visited flag so user can return to Start Page
    localStorage.removeItem("qc_has_visited");
    navigate("/");
  };

  return (
    <div className="landing-page">
      <div className="landing-scrollable">
        
        <div className="header-grid">
          <button className="landing-home-icon" onClick={handleBackToStart} aria-label="Back to start page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          
          <div className="header-actions">
            <button 
              className={`multi-select-toggle ${isMultiSelectMode ? 'active' : ''}`}
              onClick={handleToggleMultiSelect}
              aria-label="Toggle multi-select mode">
              <span className="multi-select-icon">{isMultiSelectMode ? '☑️' : '☐'}</span>
              <span className="multi-select-label">Multi-Select</span>
            </button>
            {isMultiSelectMode && (
              <>
                <button 
                  className="header-action-button"
                  onClick={handleMultiSelectAudioLoop}
                  disabled={selectedDecks.length === 0}
                  aria-label="Play audio loop"
                >
                  🎧
                </button>
                <button 
                  className="header-action-button"
                  onClick={handleMultiSelectQuiz}
                  disabled={selectedDecks.length === 0}
                  aria-label="Start quiz"
                >
                  ▶️
                </button>
              </>
            )}
          </div>
          
          <div className="header-spacer"></div>
        </div>

        {/* Dynamic Sections */}
        {sections.map(section => {
          const decks = decksPerSection[section];
          const masteredCount = decks.filter(deck => masteredSections[deck]).length;
          const isCollapsed = collapsedSections[section] || false;

          return (
            <div className="section" key={section}>
              <div className="section-header" onClick={() => toggleSectionCollapse(section)}>
                <div className="section-header-left">
                  <span className="section-chevron">{isCollapsed ? '▶' : '▼'}</span>
                  <h2 className="section-title">{section}</h2>
                </div>
                <span className="section-time">
                  {getSectionTime(decks)}
                </span>
                <span className="section-mastery">
                  {masteredCount} / {decks.length} mastered
                </span>
              </div>
              
              {!isCollapsed && (
                <div className="blocks-grid">
                  {decks.map(deck => (
                    <div 
                      key={deck}
                      className={`block-card ${
                        selectedDecks.includes(deck) && isMultiSelectMode ? "selected" : ""
                      }`}
                      onClick={() => handleDeckClick(deck)}
                    >
                      <div className="block-header">
                        <span className="block-name">{deck}</span>
                        {masteredSections[deck] && <span className="block-mastery">✓</span>}
                      </div>
                      <div className="block-footer">
                        <span 
                          className={`block-speedrun-time ${
                            getDeckBestTime(deck) !== null ? 'has-time' : ''
                          } ${
                            !masteredSections[deck] ? 'locked' : ''
                          }`}
                          title={masteredSections[deck] ? "Best time" : "Master deck to unlock speedrun"}
                        >
                          ⏱️ {getDeckSpeedrunTime(deck)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Single-deck selection modal */}
      {showDeckModal && modalDeck && (
        <div className="modal-overlay" onClick={() => setShowDeckModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{modalDeck}</h3>
            <div className="modal-buttons">
              <button className="modal-button" onClick={handleModalAudioLoop}>
                🎧 Audio Loop
              </button>
              <button className="modal-button" onClick={handleModalQuiz}>
                ▶️ Quiz
              </button>
              <button 
                className="modal-button" 
                onClick={() => {
                  if (masteredSections[modalDeck]) {
                    setShowDeckModal(false);
                    navigate(`/speedrun?deck=${encodeURIComponent(modalDeck)}`);
                  }
                }}
                disabled={!masteredSections[modalDeck]}
                style={{
                  opacity: masteredSections[modalDeck] ? 1 : 0.5,
                  cursor: masteredSections[modalDeck] ? 'pointer' : 'not-allowed'
                }}
              >
                {masteredSections[modalDeck] ? '⏱️ Deck Run' : '🔒 Deck Run (Master first)'}
              </button>
            </div>
            <button className="modal-cancel" onClick={() => setShowDeckModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
