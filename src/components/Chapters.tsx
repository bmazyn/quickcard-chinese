import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getChapters, getDecksForChapter } from "../utils/decks";
import "./Chapters.css";

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

// Get chapter rollup time (sum of all deck best times in chapter)
function getChapterRollupTime(decks: string[]): number | null {
  try {
    let total = 0;
    let hasAnyTime = false;
    
    for (const deck of decks) {
      const deckTime = getDeckBestTime(deck);
      if (deckTime !== null) {
        total += deckTime;
        hasAnyTime = true;
      } else {
        // If any deck has no time, chapter time is incomplete
        return null;
      }
    }
    
    return hasAnyTime ? total : null;
  } catch {
    return null;
  }
}

const chapters = getChapters();

export default function Chapters() {
  const navigate = useNavigate();

  const [masteredSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("quickcard_mastered_sections");
    return saved ? JSON.parse(saved) : {};
  });

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get chapter rollup time display
  const getChapterTime = (decks: string[]): string => {
    const time = getChapterRollupTime(decks);
    return time !== null ? formatTime(time) : "--:--";
  };

  const handleBackToStart = () => {
    localStorage.removeItem("qc_has_visited");
    navigate("/");
  };

  const handleChapterClick = (chapter: number) => {
    navigate(`/chapter/${chapter}`);
  };

  return (
    <div className="chapters-page">
      <div className="chapters-scrollable">
        <div className="chapters-header">
          <button className="chapters-home-icon" onClick={handleBackToStart} aria-label="Back to start page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
        </div>

        <div className="chapters-list">
          {chapters.map(chapter => {
            const decks = getDecksForChapter(chapter);
            const masteredCount = decks.filter(deck => masteredSections[deck]).length;
            
            return (
              <div 
                key={chapter}
                className="chapter-card"
                onClick={() => handleChapterClick(chapter)}
              >
                <div className="chapter-card-header">
                  <h2 className="chapter-card-title">Chapter {chapter}</h2>
                </div>
                <div className="chapter-card-footer">
                  <span className="chapter-card-time">
                    ⏱️ {getChapterTime(decks)}
                  </span>
                  <span className="chapter-card-mastery">
                    {masteredCount} / {decks.length} mastered
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
