import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDeckEntriesForSection, getChapterStructure } from "../utils/decks";
import { getBestTime as getMatchDeckBestTime, isDeckComplete } from "../utils/deckProgress";
import type { Deck } from "../types";
import "./ChapterDetail.css";

type DeckEntry = Deck & { deckId: string };

// Get best time for a deck entry.
// Match decks are keyed by deckId; normal decks use the legacy deckName key
// so existing Speedrun saves are preserved.
function getDeckEntryBestTime(entry: DeckEntry): number | null {
  try {
    if (entry.mode === "match") {
      return getMatchDeckBestTime(entry.deckId);
    }
    const key = `qc_deck_speedrun_best:${entry.deckName}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

// Section rollup time: sum of all deck best times (null if any is missing)
function getSectionRollupTime(entries: DeckEntry[]): number | null {
  try {
    let total = 0;
    let hasAnyTime = false;

    for (const entry of entries) {
      const deckTime = getDeckEntryBestTime(entry);
      if (deckTime !== null) {
        total += deckTime;
        hasAnyTime = true;
      } else {
        // If any deck has no time, section rollup is incomplete
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
const deckEntriesPerSection: Record<string, DeckEntry[]> = {};
Object.values(chapterStructure).flat().forEach(section => {
  deckEntriesPerSection[section] = getDeckEntriesForSection(section);
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

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get deck speedrun best time display string
  const getDeckSpeedrunTime = (entry: DeckEntry): string => {
    const time = getDeckEntryBestTime(entry);
    return time !== null ? formatTime(time) : "--:--";
  };

  // Get section rollup time display string
  const getSectionTime = (entries: DeckEntry[]): string => {
    const time = getSectionRollupTime(entries);
    return time !== null ? formatTime(time) : "--:--";
  };

  // Mastery check: match decks use deckId, normal decks use deckName (legacy key)
  const isMasteredEntry = (entry: DeckEntry): boolean => {
    if (entry.mode === "match") {
      return isDeckComplete(entry.deckId);
    }
    return !!masteredSections[entry.deckName];
  };

  useEffect(() => {
    localStorage.setItem("selectedDecks", JSON.stringify(selectedDecks));
  }, [selectedDecks]);

  const handleDeckClick = (entry: DeckEntry) => {
    if (entry.mode === "match") {
      // Match deck: go straight to Rolling Match using the source chapter's card pool.
      // Pass deckId and returnTo so RollingMatchPage can persist results.
      navigate(`/chapter/${entry.sourceChapter}/bonus/rolling-match`, {
        state: {
          deckId: entry.deckId,
          returnTo: `/chapter/${chapter}`,
        },
      });
      return;
    }
    // Normal deck: existing modal / multi-select behaviour
    const deck = entry.deckName;
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
          const entries = deckEntriesPerSection[section];
          const masteredCount = entries.filter(e => isMasteredEntry(e)).length;

          return (
            <div className="section" key={section}>
              <div className="section-group-container">
                <div className="section-header">
                  <div className="section-header-left">
                    <h2 className="section-title">{section}</h2>
                  </div>
                  <span className="section-time">
                    {getSectionTime(entries)}
                  </span>
                  <span className="section-mastery">
                    {masteredCount} / {entries.length} mastered
                  </span>
                </div>

                <div className="blocks-grid">
                  {entries.map(entry => {
                    const mastered = isMasteredEntry(entry);
                    const isMatch = entry.mode === "match";
                    return (
                      <div
                        key={entry.deckId}
                        className={`block-card ${
                          selectedDecks.includes(entry.deckName) && isMultiSelectMode && !isMatch
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleDeckClick(entry)}
                      >
                        <div className="block-header">
                          <span className="block-name">{entry.deckName}</span>
                        </div>
                        <div className="block-footer">
                          {mastered && <span className="block-mastery">✓</span>}
                          <span
                            className={`block-speedrun-time ${
                              getDeckEntryBestTime(entry) !== null ? 'has-time' : ''
                            } ${
                              !isMatch && !mastered ? 'locked' : ''
                            }`}
                            title={
                              isMatch
                                ? "Best match time"
                                : mastered
                                ? "Best time"
                                : "Master deck to unlock speedrun"
                            }
                          >
                            ⏱️ {getDeckSpeedrunTime(entry)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
