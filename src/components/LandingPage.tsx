import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSections, getDecksForSection, getChapterStructure, getDeckIdByName } from "../utils/decks";
import "./LandingPage.css";
// comment to test

// Compute sections and decks from decks.json
const sections = getSections();
const decksPerSection: Record<string, string[]> = {};
sections.forEach(section => {
  decksPerSection[section] = getDecksForSection(section);
});
const chapterStructure = getChapterStructure();

export default function LandingPage() {
  const navigate = useNavigate();

  const [selectedDecks, setSelectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  });

  const [collapsedChapters, setCollapsedChapters] = useState<Record<number, boolean>>({});
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [modalDeck, setModalDeck] = useState<string | null>(null);

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
    
    // Set selected deck and navigate
    localStorage.setItem("selectedDecks", JSON.stringify(decksToSelect));
    
    // Pass selectedDecks through navigation state as primary source
    navigate("/quiz", { state: { selectedDecks: decksToSelect } });
  };

  const handleMultiSelectQuiz = () => {
    if (selectedDecks.length === 0) return;
    
    // Pass selectedDecks through navigation state as primary source
    navigate("/quiz", { state: { selectedDecks: selectedDecks } });
  };

  const toggleChapterCollapse = (chapter: number) => {
    setCollapsedChapters(prev => ({
      ...prev,
      [chapter]: !prev[chapter]
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
          
          <div className="header-spacer"></div>
        </div>

        {/* Dynamic Sections grouped by Chapter */}
        {Object.keys(chapterStructure).sort((a, b) => Number(a) - Number(b)).map(chapterNum => {
          const chapter = Number(chapterNum);
          const sectionsInChapter = chapterStructure[chapter];
          const isChapterCollapsed = collapsedChapters[chapter] || false;
          
          return (
            <div key={`chapter-${chapter}`}>
              <div className="chapter-header" onClick={() => toggleChapterCollapse(chapter)}>
                <span className="chapter-chevron">{isChapterCollapsed ? '▶' : '▼'}</span>
                <span>Chapter {chapter}</span>
              </div>
              {!isChapterCollapsed && sectionsInChapter.map(section => {
                const decks = decksPerSection[section];

                return (
                  <div className="section" key={section}>
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
                );
              })}
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
