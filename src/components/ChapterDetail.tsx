import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDecksForSection, getChapterStructure } from "../utils/decks";
import "./ChapterDetail.css";

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

// Compute chapter structure from decks.json
const chapterStructure = getChapterStructure();
const decksPerSection: Record<string, string[]> = {};
Object.values(chapterStructure).flat().forEach(section => {
  decksPerSection[section] = getDecksForSection(section);
});

export default function ChapterDetail() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const chapter = chapterId ? Number(chapterId) : 1;
  
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

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [modalDeck, setModalDeck] = useState<string | null>(null);

  const [rollingBestTime] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(`rollingBestTime_ch${chapter}`);
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  });

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
    
    navigate(`/audio-loop?decks=${encodeURIComponent(modalDeck)}`, { state: { chapterId: chapter } });
  };

  const handleModalQuiz = () => {
    if (!modalDeck) return;
    setShowDeckModal(false);
    
    const decksToSelect = [modalDeck];
    
    // Set selected deck in localStorage
    localStorage.setItem("selectedDecks", JSON.stringify(decksToSelect));
    
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
    
    // Pass selectedDecks through navigation state as primary source
    navigate("/quiz", { state: { chapterId: chapter, selectedDecks: decksToSelect } });
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
    
    navigate(`/audio-loop?decks=${encodeURIComponent(selectedDecks.join(','))}`, { state: { chapterId: chapter } });
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
    
    // Pass selectedDecks through navigation state as primary source
    navigate("/quiz", { state: { chapterId: chapter, selectedDecks: selectedDecks } });
  };

  const handleBackToChapters = () => {
    navigate("/chapters");
  };

  const sectionsInChapter = chapterStructure[chapter] || [];

  return (
    <div className="chapter-detail-page">
      <div className="chapter-detail-scrollable">
        
        <div className="detail-header-grid">
          <div className="detail-header-top">
            <button className="detail-back-button" onClick={handleBackToChapters} aria-label="Back to chapters">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="detail-chapter-title">Chapter {chapter}</h1>
          </div>
          
          <div className="detail-header-actions">
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
        </div>

        {/* Sections for this chapter */}
        {sectionsInChapter.map(section => {
          const decks = decksPerSection[section];
          const masteredCount = decks.filter(deck => masteredSections[deck]).length;

          return (
            <div className="section" key={section}>
              <div className="section-group-container">
                <div className="section-header">
                  <div className="section-header-left">
                    <h2 className="section-title">{section}</h2>
                  </div>
                  <span className="section-time">
                    {getSectionTime(decks)}
                  </span>
                  <span className="section-mastery">
                    {masteredCount} / {decks.length} mastered
                  </span>
                </div>
                
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
                      </div>
                      <div className="block-footer">
                        {masteredSections[deck] && <span className="block-mastery">✓</span>}
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
              </div>
            </div>
          );
        })}

        {/* ── Bonus activities ── */}
        <div className="bonus-section">
          <button
            className="bonus-card"
            onClick={() => navigate(`/chapter/${chapterId}/bonus/rolling-match`)}
          >
            <span className="bonus-card-icon">🔀</span>
            <span className="bonus-card-body">
              <span className="bonus-card-name">Rolling Match</span>
              <span className="bonus-card-desc">Match pinyin to English</span>
            </span>
            {rollingBestTime !== null && (
              <span className="bonus-card-time">⏱️ {formatTime(rollingBestTime)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Single-deck selection modal */}
      {showDeckModal && modalDeck && (
        <div className="modal-overlay" onClick={() => setShowDeckModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{modalDeck}</h3>
            <div className="modal-buttons">
              <button className="modal-button" onClick={() => {
                setShowDeckModal(false);
                navigate(`/study-list?deck=${encodeURIComponent(modalDeck)}`, { state: { chapterId: chapter } });
              }}>
                📋 Study List
              </button>
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
                    navigate(`/speedrun?deck=${encodeURIComponent(modalDeck)}`, { state: { chapterId: chapter } });
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
