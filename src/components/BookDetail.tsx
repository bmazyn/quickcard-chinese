import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getChaptersForBook, getDeckEntriesForChapter } from "../utils/decks";
import { getBestTime, isDeckComplete } from "../utils/deckProgress";
import { getChapterListeningBest, chapterHasListeningCards } from "../utils/listeningChallenge";
import { getMeaningRecallBest, chapterHasMeaningRecallVocab } from "../utils/meaningRecall";
import type { Deck } from "../types";
import "./BookDetail.css";

type DeckEntry = Deck & { deckId: string };

// Get best time for a deck entry.
// Match decks are keyed by deckId; normal decks use the legacy deckName key.
function getDeckEntryBestTime(entry: DeckEntry): number | null {
  try {
    if (entry.mode === "match") {
      return getBestTime(entry.deckId);
    }
    const key = `qc_deck_speedrun_best:${entry.deckName}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

// Chapter rollup time: only meaningful when the ENTIRE chapter is done.
// Returns null (→ "--:--") if any deck is unmastered OR any best time is missing.
function getChapterRollupTime(entries: DeckEntry[]): number | null {
  try {
    const masteredMap: Record<string, boolean> = JSON.parse(
      localStorage.getItem("quickcard_mastered_sections") ?? "{}"
    );
    let total = 0;
    for (const entry of entries) {
      // Every deck must be mastered
      const mastered =
        entry.mode === "match"
          ? isDeckComplete(entry.deckId)
          : !!masteredMap[entry.deckName];
      if (!mastered) return null;
      // Every deck must have a recorded best time
      const t = getDeckEntryBestTime(entry);
      if (t === null) return null;
      total += t;
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

export default function BookDetail() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const bookNumber = bookId ? parseInt(bookId, 10) : 0;
  const chapters = getChaptersForBook(bookNumber);

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
  const getChapterTime = (entries: DeckEntry[]): string => {
    const time = getChapterRollupTime(entries);
    return time !== null ? formatTime(time) : "--:--";
  };

  const handleBackToBooks = () => {
    navigate("/books");
  };

  const handleChapterClick = (chapter: number) => {
    navigate(`/chapters/${chapter}`, { state: { bookId: bookNumber } });
  };

  return (
    <div className="book-detail-page">
      <div className="book-detail-scrollable">
        <div className="book-detail-header">
          <button className="book-detail-back-icon" onClick={handleBackToBooks} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="book-detail-title">Book {bookNumber}</h1>
        </div>

        <div className="book-detail-chapters-list">
          {chapters.map(chapter => {
            const entries = getDeckEntriesForChapter(chapter);
            const masteredCount = entries.filter(entry =>
              entry.mode === "match"
                ? isDeckComplete(entry.deckId)
                : !!masteredSections[entry.deckName]
            ).length;
            const isChapterComplete = masteredCount === entries.length && entries.length > 0;
            const listeningBest = getChapterListeningBest(chapter);
            const hasListeningCards = chapterHasListeningCards(chapter);
            const hasMrVocab = chapterHasMeaningRecallVocab(chapter);
            const mrBest = hasMrVocab ? getMeaningRecallBest(chapter) : null;

            return (
              <div 
                key={chapter}
                className="book-detail-chapter-card"
                onClick={() => handleChapterClick(chapter)}
              >
                <div className="book-detail-chapter-card-header">
                  <h2 className="book-detail-chapter-card-title">
                    Chapter {chapter}
                    {isChapterComplete && <span className="chapter-completion-check">✓</span>}
                  </h2>
                </div>
                <div className="book-detail-chapter-card-footer">
                  <span className="book-detail-chapter-card-time">
                    ⏱️ {getChapterTime(entries)}
                  </span>
                  {!hasListeningCards ? (
                    <span className="book-detail-chapter-card-listening">
                      🔊 N/A
                    </span>
                  ) : listeningBest ? (
                    <span className="book-detail-chapter-card-listening">
                      🔊 {listeningBest.correct} / {listeningBest.total}
                    </span>
                  ) : null}
                  {hasMrVocab && (
                    <span className="book-detail-chapter-card-mr">
                      ✍️ {mrBest ? `${mrBest.correct}/${mrBest.total}` : '--'}
                    </span>
                  )}
                  <span className="book-detail-chapter-card-mastery">
                    {masteredCount} / {entries.length} mastered
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
