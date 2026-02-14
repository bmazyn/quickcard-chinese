import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getChapters, getDecksForChapter } from "../utils/decks";
import "./Chapters.css";

const chapters = getChapters();

export default function Chapters() {
  const navigate = useNavigate();

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
                  <span className="chapter-card-mastery">
                    {decks.length} deck{decks.length !== 1 ? 's' : ''}
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
