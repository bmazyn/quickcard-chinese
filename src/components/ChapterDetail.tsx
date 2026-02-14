import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDecksForSection, getChapterStructure, getDeckIdByName } from "../utils/decks";
import "./ChapterDetail.css";

// Get deck stats from localStorage
function getDeckStats(deckId: string): { attempts: number; correct: number } | null {
  try {
    const key = `de_quiz_stats:${deckId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Get percent correct for a deck
function getDeckPercentCorrect(deckId: string): string {
  const stats = getDeckStats(deckId);
  if (!stats || stats.attempts === 0) {
    return "No attempts yet";
  }
  const percent = Math.round((stats.correct / stats.attempts) * 100);
  return `${percent}%`;
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

  const [selectedDecks, setSelectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  });

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [modalDeck, setModalDeck] = useState<string | null>(null);

  // Format time as mm:ss
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

  const handleModalQuiz = () => {
    if (!modalDeck) return;
    setShowDeckModal(false);
    
    const decksToSelect = [modalDeck];
    
    // Set selected deck in localStorage
    localStorage.setItem("selectedDecks", JSON.stringify(decksToSelect));
    
    // Pass selectedDecks through navigation state as primary source
    navigate("/quiz", { state: { chapterId: chapter, selectedDecks: decksToSelect } });
  };

  const handleMultiSelectQuiz = () => {
    if (selectedDecks.length === 0) return;
    
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
              <button 
                className="header-action-button"
                onClick={handleMultiSelectQuiz}
                disabled={selectedDecks.length === 0}
                aria-label="Start quiz"
              >
                ▶️
              </button>
            )}
          </div>
        </div>

        {/* Sections for this chapter */}
        {sectionsInChapter.map(section => {
          const decks = decksPerSection[section];

          return (
            <div className="section" key={section}>
              <div className="section-group-container">
                <div className="section-header">
                  <div className="section-header-left">
                    <h2 className="section-title">{section}</h2>
                  </div>
                </div>
                
                <div className="blocks-grid">
                  {decks.map(deck => {
                    const deckId = getDeckIdByName(deck);
                    const percentText = deckId ? getDeckPercentCorrect(deckId) : "No attempts yet";
                    
                    return (
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
                          <span className="block-percent">{percentText}</span>
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
