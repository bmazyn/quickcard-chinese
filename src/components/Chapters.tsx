import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getChapters, getDeckEntriesForChapter } from "../utils/decks";
import { getBestTime, isDeckComplete } from "../utils/deckProgress";
import type { Deck } from "../types";
import "./Chapters.css";

type DeckEntry = Deck & { deckId: string };

// Get best time for a deck entry.
// Match decks are keyed by deckId; normal decks use the legacy deckName key.
// Mirrors getDeckEntryBestTime in ChapterDetail.tsx.
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

// ── Debug helpers (exported so they can be called from the browser console) ──

/** Returns all deck entries configured for a chapter. */
export function getChapterDecks(chapterId: number): DeckEntry[] {
  const entries = getDeckEntriesForChapter(chapterId);
  console.log(`[getChapterDecks] chapter=${chapterId}`, entries);
  return entries;
}

/** Returns { mastered, total } for a chapter, counting ALL deck modes. */
export function getChapterMasteredStats(
  chapterId: number
): { mastered: number; total: number } {
  const entries = getDeckEntriesForChapter(chapterId);
  const masteredMap: Record<string, boolean> = JSON.parse(
    localStorage.getItem("quickcard_mastered_sections") ?? "{}"
  );
  const mastered = entries.filter(entry =>
    entry.mode === "match"
      ? isDeckComplete(entry.deckId)
      : !!masteredMap[entry.deckName]
  ).length;
  const result = { mastered, total: entries.length };
  console.log(`[getChapterMasteredStats] chapter=${chapterId}`, result);
  return result;
}

/** Returns the summed best-time (seconds) for a fully-complete chapter,
 *  or null if any deck is unmastered or missing a best time. */
export function getChapterBestTime(chapterId: number): number | null {
  const entries = getDeckEntriesForChapter(chapterId);
  const time = getChapterRollupTime(entries);
  console.log(
    `[getChapterBestTime] chapter=${chapterId}`,
    time !== null ? `${time}s` : "incomplete (null)"
  );
  return time;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const getChapterTime = (entries: DeckEntry[]): string => {
    const time = getChapterRollupTime(entries);
    return time !== null ? formatTime(time) : "--:--";
  };

  // Log Chapter 5 debug stats once on mount for verification
  useEffect(() => {
    getChapterMasteredStats(5);
    getChapterBestTime(5);
  }, []);

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
            const entries = getDeckEntriesForChapter(chapter);
            const masteredCount = entries.filter(entry =>
              entry.mode === "match"
                ? isDeckComplete(entry.deckId)
                : !!masteredSections[entry.deckName]
            ).length;

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
                    ⏱️ {getChapterTime(entries)}
                  </span>
                  <span className="chapter-card-mastery">
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
