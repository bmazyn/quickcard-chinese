import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import quizCards from "../data/quizCards.json";
import "./LandingPage.css";

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

  // Get speedrun best time from localStorage
  const getSpeedrunTime = (section: string, isLocked: boolean): string => {
    if (isLocked) return "—:—";
    
    try {
      const key = `qc_speedrun_best_seconds:${section}`;
      const saved = localStorage.getItem(key);
      if (!saved) return "—:—";
      
      const missedKey = `qc_speedrun_last_misses:${section}`;
      const missedSaved = localStorage.getItem(missedKey);
      const missedCount = missedSaved ? parseInt(missedSaved, 10) : 0;
      
      return `${formatTime(parseInt(saved, 10))} / ${missedCount}`;
    } catch {
      return "—:—";
    }
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

  const handleSpeedrunClick = (section: string, isLocked: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent section collapse toggle
    if (!isLocked) {
      navigate(`/speedrun?section=${encodeURIComponent(section)}`);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-scrollable">
        
        <div className="header-actions">
          <button 
            className={`multi-select-toggle ${isMultiSelectMode ? 'active' : ''}`}
            onClick={handleToggleMultiSelect}
            aria-label="Toggle multi-select mode"
          >
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

        {/* Dynamic Sections */}
        {sections.map(section => {
          const decks = decksPerSection[section];
          const masteredCount = decks.filter(deck => masteredSections[deck]).length;
          const allMastered = decks.length > 0 && masteredCount === decks.length;
          const isCollapsed = collapsedSections[section] || false;
          const speedrunLocked = !allMastered;

          return (
            <div className="section" key={section}>
              <div className="section-header" onClick={() => toggleSectionCollapse(section)}>
                <div className="section-header-left">
                  <span className="section-chevron">{isCollapsed ? '▶' : '▼'}</span>
                  <h2 className="section-title">{section}</h2>
                </div>
                <span 
                  className={`section-time ${speedrunLocked ? 'locked' : 'unlocked'}`}
                  onClick={(e) => handleSpeedrunClick(section, speedrunLocked, e)}
                  title={speedrunLocked ? "Speedrun unlocks after mastering all decks" : "Start speedrun"}
                >
                  {getSpeedrunTime(section, speedrunLocked)}
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
                      <span className="block-name">{deck}</span>
                      {masteredSections[deck] && <span className="block-mastery"></span>}
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
