import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getAllDecks } from "../utils/decks";
import "./RollingMatchPage.css";

const DISPLAY_COUNT = 7;
const POOL_SIZE = 20;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface MatchItem {
  id: string;
  promptLine: string;
  english: string;
}

interface RightItem {
  id: string;
  text: string;
}

interface GameState {
  activeLeft: MatchItem[];
  activeRight: RightItem[];
  queue: MatchItem[];
  matchedCount: number;
  totalCards: number;
}

function buildGame(chapter: number): GameState {
  const allCards = quizCardsData as QuizCard[];

  const chapterDeckIds = new Set(
    getAllDecks()
      .filter((d) => d.chapter === chapter)
      .map((d) => d.deckId)
  );

  const EXCLUDED_TAGS = new Set(["phrase", "phrases", "reverse", "pairs"]);

  const filtered = allCards.filter(
    (card) =>
      card.kind === "vocab" &&
      card.promptLine.includes("—") &&
      chapterDeckIds.has(card.deckId) &&
      !card.tags.some((tag) => EXCLUDED_TAGS.has(tag))
  );

  const pool = shuffleArray(filtered).slice(0, POOL_SIZE);
  const totalCards = pool.length;

  const items: MatchItem[] = pool.map((card) => ({
    id: card.id,
    promptLine: card.promptLine,
    english: card.choices[card.correct],
  }));

  const initialActive = items.slice(0, Math.min(DISPLAY_COUNT, totalCards));
  const initialQueue = items.slice(Math.min(DISPLAY_COUNT, totalCards));

  return {
    activeLeft: initialActive,
    activeRight: shuffleArray(
      initialActive.map((item) => ({ id: item.id, text: item.english }))
    ),
    queue: initialQueue,
    matchedCount: 0,
    totalCards,
  };
}

export default function RollingMatchPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const chapter = chapterId ? Number(chapterId) : 1;

  const [gameKey, setGameKey] = useState(0);
  const [game, setGame] = useState<GameState>({
    activeLeft: [],
    activeRight: [],
    queue: [],
    matchedCount: 0,
    totalCards: 0,
  });

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{
    leftId: string;
    rightId: string;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const timerRef = useRef<number | null>(null);
  const wrongTimeoutRef = useRef<number | null>(null);

  // (Re-)initialize game
  useEffect(() => {
    setGame(buildGame(chapter));
    setElapsed(0);
    setIsComplete(false);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setWrongPair(null);

    if (timerRef.current !== null) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (wrongTimeoutRef.current !== null) {
        clearTimeout(wrongTimeoutRef.current);
        wrongTimeoutRef.current = null;
      }
    };
  }, [chapter, gameKey]);

  // Stop timer when all cards are matched
  useEffect(() => {
    if (game.totalCards > 0 && game.matchedCount === game.totalCards) {
      setIsComplete(true);
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [game.matchedCount, game.totalCards]);

  const handleMatch = (leftId: string, rightId: string) => {
    setSelectedLeftId(null);
    setSelectedRightId(null);

    if (leftId === rightId) {
      // Correct match
      setGame((prev) => {
        const newLeft = prev.activeLeft.filter((item) => item.id !== leftId);
        const newRight = prev.activeRight.filter((item) => item.id !== rightId);
        const newMatchedCount = prev.matchedCount + 1;

        if (prev.queue.length > 0) {
          const [next, ...restQueue] = prev.queue;
          const insertPos = Math.floor(Math.random() * (newRight.length + 1));
          const updatedRight = [
            ...newRight.slice(0, insertPos),
            { id: next.id, text: next.english },
            ...newRight.slice(insertPos),
          ];
          return {
            ...prev,
            activeLeft: [...newLeft, next],
            activeRight: updatedRight,
            queue: restQueue,
            matchedCount: newMatchedCount,
          };
        }

        return {
          ...prev,
          activeLeft: newLeft,
          activeRight: newRight,
          matchedCount: newMatchedCount,
        };
      });
    } else {
      // Wrong match — flash, then clear
      setWrongPair({ leftId, rightId });
      wrongTimeoutRef.current = window.setTimeout(() => {
        setWrongPair(null);
        wrongTimeoutRef.current = null;
      }, 600);
    }
  };

  const handleSelectLeft = (id: string) => {
    if (wrongPair) return;
    if (selectedRightId !== null) {
      handleMatch(id, selectedRightId);
    } else if (selectedLeftId === id) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(id);
    }
  };

  const handleSelectRight = (id: string) => {
    if (wrongPair) return;
    if (selectedLeftId !== null) {
      handleMatch(selectedLeftId, id);
    } else if (selectedRightId === id) {
      setSelectedRightId(null);
    } else {
      setSelectedRightId(id);
    }
  };

  const handleRestart = () => {
    setGameKey((k) => k + 1);
  };

  const hasNoCards = game.totalCards === 0;
  const isLoading = game.totalCards === 0 && gameKey >= 0;

  return (
    <div className="rm-page">
      {/* ── Header ── */}
      <div className="rm-header">
        <button
          className="rm-back-btn"
          onClick={() => navigate(`/chapter/${chapterId}`)}
          aria-label="Back to chapter"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="rm-header-center">
          <span className="rm-title">Rolling Match</span>
          <span className="rm-subtitle">Chapter {chapter}</span>
        </div>

        <div className="rm-header-right">
          <span className="rm-timer">{formatTime(elapsed)}</span>
          <span className="rm-progress">
            {game.matchedCount}
            <span className="rm-progress-sep">/</span>
            {game.totalCards || "—"}
          </span>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!isLoading && hasNoCards && (
        <div className="rm-empty">
          <p className="rm-empty-msg">
            No vocab cards found for Chapter {chapter}.
          </p>
          <button
            className="rm-btn-primary"
            onClick={() => navigate(`/chapter/${chapterId}`)}
          >
            Back to Chapter
          </button>
        </div>
      )}

      {/* ── Game board ── */}
      {!hasNoCards && !isComplete && (
        <div className="rm-board">
          {/* Left column — Chinese prompt */}
          <div className="rm-col rm-col-left">
            <div className="rm-col-label">Chinese</div>
            {game.activeLeft.map((item) => {
              const isSelected = selectedLeftId === item.id;
              const isWrong = wrongPair?.leftId === item.id;
              return (
                <button
                  key={item.id}
                  className={`rm-card${isSelected ? " rm-selected" : ""}${
                    isWrong ? " rm-wrong" : ""
                  }`}
                  onClick={() => handleSelectLeft(item.id)}
                >
                  <span className="rm-prompt">{item.promptLine}</span>
                </button>
              );
            })}
          </div>

          {/* Right column — English meaning */}
          <div className="rm-col rm-col-right">
            <div className="rm-col-label">English</div>
            {game.activeRight.map((item) => {
              const isSelected = selectedRightId === item.id;
              const isWrong = wrongPair?.rightId === item.id;
              return (
                <button
                  key={item.id}
                  className={`rm-card${isSelected ? " rm-selected" : ""}${
                    isWrong ? " rm-wrong" : ""
                  }`}
                  onClick={() => handleSelectRight(item.id)}
                >
                  <span className="rm-english">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Completion overlay ── */}
      {isComplete && (
        <div className="rm-complete-overlay">
          <div className="rm-complete-card">
            <div className="rm-complete-emoji">🎉</div>
            <h2 className="rm-complete-title">Nice work!</h2>
            <div className="rm-complete-time">{formatTime(elapsed)}</div>
            <p className="rm-complete-sub">
              {game.totalCards} cards matched
            </p>
            <div className="rm-complete-actions">
              <button className="rm-btn-primary" onClick={handleRestart}>
                Play Again
              </button>
              <button
                className="rm-btn-secondary"
                onClick={() => navigate(`/chapter/${chapterId}`)}
              >
                Back to Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
