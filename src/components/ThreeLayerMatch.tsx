import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getAllDecks } from "../utils/decks";
import {
  extractVocabTriples,
  buildBoard,
  isValidPair,
  type ThreeLayerBoard,
} from "../utils/threeLayerMatch";
import "./ThreeLayerMatch.css";

const BOARD_SIZE = 15;

// ─── Tiny confetti burst ──────────────────────────────────────────────────────
function spawnConfetti(container: HTMLElement) {
  const colors = ["#4a90e2", "#22c55e", "#f59e0b", "#ec4899", "#a78bfa"];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement("span");
    el.className = "tlm-confetti-piece";
    el.style.setProperty("--x", `${(Math.random() - 0.5) * 320}px`);
    el.style.setProperty("--y", `${-(60 + Math.random() * 220)}px`);
    el.style.setProperty("--rot", `${Math.random() * 720}deg`);
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = `${6 + Math.random() * 6}px`;
    el.style.height = `${6 + Math.random() * 6}px`;
    el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    el.style.animationDelay = `${Math.random() * 0.4}s`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
}

// ─── Speak hanzi via Web Speech API ─────────────────────────────────────────
function speakHanzi(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

type RowKind = "hanzi" | "english";

interface Selection {
  hanzi: number | null;
  english: number | null;
}

interface CellState {
  matched: boolean;
  /** "error" | "success" | null */
  flash: "error" | "success" | null;
}

function makeEmptyCells(): CellState[][] {
  return [
    Array.from({ length: BOARD_SIZE }, () => ({ matched: false, flash: null })),
    Array.from({ length: BOARD_SIZE }, () => ({ matched: false, flash: null })),
  ];
}

function rowIndex(kind: RowKind): number {
  return kind === "hanzi" ? 0 : 1;
}

export default function ThreeLayerMatch() {
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const chapter = chapterId ? Number(chapterId) : 1;

  const [gameKey, setGameKey] = useState(0);
  const [board, setBoard] = useState<ThreeLayerBoard | null>(null);
  const [noCards, setNoCards] = useState(false);

  const [cells, setCells] = useState<CellState[][]>(makeEmptyCells());
  const [sel, setSel] = useState<Selection>({ hanzi: null, english: null });
  const [matchedCount, setMatchedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // locked during flash

  const celebrationRef = useRef<HTMLDivElement | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build board on mount / restart ──────────────────────────────────────
  useEffect(() => {
    const allCards = quizCardsData as QuizCard[];
    const chapterDeckIds = new Set(
      getAllDecks()
        .filter((d) => d.chapter === chapter)
        .map((d) => d.deckId)
    );

    const triples = extractVocabTriples(allCards, chapterDeckIds);
    const newBoard = buildBoard(triples);

    if (!newBoard) {
      setNoCards(true);
      setBoard(null);
    } else {
      setNoCards(false);
      setBoard(newBoard);
    }

    setCells(makeEmptyCells());
    setSel({ hanzi: null, english: null });
    setMatchedCount(0);
    setIsComplete(false);
    setIsLocked(false);

    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [chapter, gameKey]);

  // ── Handle cell tap ──────────────────────────────────────────────────────
  const handleTap = useCallback(
    (kind: RowKind, pos: number) => {
      if (!board || isLocked) return;
      const ri = rowIndex(kind);
      if (cells[ri][pos].matched) return;

      // Speak the hanzi on tap (called directly in click handler for iOS)
      if (kind === "hanzi") {
        const itemIdx = board.hanziOrder[pos];
        const item = board.items[itemIdx];
        if (item) speakHanzi(item.hanzi);
      }

      setSel((prev) => {
        const next = { ...prev };

        // Toggle deselect
        if (next[kind] === pos) {
          next[kind] = null;
          return next;
        }

        next[kind] = pos;

        // Check if both rows are now selected
        const h = kind === "hanzi" ? pos : next.hanzi;
        const e = kind === "english" ? pos : next.english;

        if (h !== null && e !== null) {
          // Evaluate
          setIsLocked(true);
          const correct = isValidPair(board, h, e);
          const flashKind: "success" | "error" = correct ? "success" : "error";

          // Flash the two cells
          setCells((prevCells) => {
            const nc = prevCells.map((row) => row.map((c) => ({ ...c })));
            nc[0][h].flash = flashKind;
            nc[1][e].flash = flashKind;
            return nc;
          });

          if (flashTimer.current) clearTimeout(flashTimer.current);

          if (correct) {
            flashTimer.current = setTimeout(() => {
              setCells((prevCells) => {
                const nc = prevCells.map((row) => row.map((c) => ({ ...c })));
                nc[0][h] = { matched: true, flash: null };
                nc[1][e] = { matched: true, flash: null };
                return nc;
              });
              setMatchedCount((c) => {
                const next = c + 1;
                if (next >= BOARD_SIZE) {
                  setIsComplete(true);
                  // Fire confetti a tick later so the DOM is ready
                  setTimeout(() => {
                    if (celebrationRef.current) spawnConfetti(celebrationRef.current);
                  }, 80);
                }
                return next;
              });
              setSel({ hanzi: null, english: null });
              setIsLocked(false);
            }, 480);
          } else {
            flashTimer.current = setTimeout(() => {
              setCells((prevCells) => {
                const nc = prevCells.map((row) => row.map((c) => ({ ...c })));
                nc[0][h].flash = null;
                nc[1][e].flash = null;
                return nc;
              });
              setSel({ hanzi: null, english: null });
              setIsLocked(false);
            }, 500);
          }

          // Return cleared selection so we don't show both "selected" briefly
          return { hanzi: null, english: null };
        }

        return next;
      });
    },
    [board, cells, isLocked]
  );

  const handleRestart = () => setGameKey((k) => k + 1);

  // ── Render helpers ────────────────────────────────────────────────────────
  function getCellClass(kind: RowKind, pos: number): string {
    const ri = rowIndex(kind);
    const cell = cells[ri][pos];
    let cls = "tlm-cell";
    if (cell.matched) return cls + " tlm-matched";
    if (cell.flash === "success") return cls + " tlm-flash-success";
    if (cell.flash === "error") return cls + " tlm-flash-error";
    if (sel[kind] === pos) return cls + " tlm-selected";
    return cls;
  }

  function getCellLabel(kind: RowKind, pos: number): string {
    if (!board) return "";
    const ri = rowIndex(kind);
    if (cells[ri][pos].matched) return "";
    const itemIdx =
      kind === "hanzi" ? board.hanziOrder[pos] : board.englishOrder[pos];
    const item = board.items[itemIdx];
    if (!item) return "";
    return kind === "hanzi" ? item.hanzi : item.english;
  }

  const rows: { kind: RowKind; label: string; extraClass: string }[] = [
    { kind: "hanzi", label: "Hanzi", extraClass: "tlm-row--hanzi" },
    { kind: "english", label: "English", extraClass: "tlm-row--english" },
  ];

  return (
    <div className="tlm-page">
      <div className="tlm-shell">

        {/* ── Header ── */}
        <div className="tlm-header">
          <button
            className="tlm-back-btn"
            onClick={() => navigate(`/chapter/${chapterId}`)}
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <div className="tlm-header-center">
            <span className="tlm-title">Match</span>
            <span className="tlm-subtitle">Chapter {chapter}</span>
          </div>

          <div className="tlm-header-right">
            <span className="tlm-progress-badge">
              <span className="tlm-progress-num">{matchedCount}</span>
              <span className="tlm-progress-sep">/</span>
              <span className="tlm-progress-num">{BOARD_SIZE}</span>
            </span>
          </div>
        </div>

        {/* ── Instructions strip ── */}
        {!noCards && !isComplete && (
          <p className="tlm-instructions">
            Tap one Hanzi and one English to match • {BOARD_SIZE - matchedCount} remaining
          </p>
        )}

        {/* ── No cards fallback ── */}
        {noCards && (
          <div className="tlm-empty">
            <div className="tlm-empty-icon">📭</div>
            <p className="tlm-empty-msg">
              Not enough vocab cards found for Chapter {chapter}.
              <br />
              At least {BOARD_SIZE} unique vocab items are required.
            </p>
            <button className="tlm-btn-secondary" onClick={() => navigate(`/chapter/${chapterId}`)}>
              Back to Chapter
            </button>
          </div>
        )}

        {/* ── Board ── */}
        {board && !noCards && (
          <div className="tlm-board">
            {rows.map(({ kind, label, extraClass }) => (
              <section key={kind} className={`tlm-row ${extraClass}`}>
                <div className="tlm-row-label">{label}</div>
                <div className="tlm-row-grid">
                  {Array.from({ length: BOARD_SIZE }, (_, pos) => {
                    const cellLabel = getCellLabel(kind, pos);
                    const cellClass = getCellClass(kind, pos);
                    const isMatched = cells[rowIndex(kind)][pos].matched;
                    return (
                      <button
                        key={pos}
                        className={cellClass}
                        onClick={() => handleTap(kind, pos)}
                        disabled={isMatched || isLocked}
                        aria-label={cellLabel || "matched"}
                        aria-pressed={sel[kind] === pos && !isMatched}
                      >
                        <span className="tlm-cell-text">{cellLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── Reset button ── */}
        {board && !noCards && !isComplete && (
          <div className="tlm-footer">
            <button className="tlm-reset-btn" onClick={handleRestart}>
              ↺ New Board
            </button>
          </div>
        )}

        {/* ── Completion overlay ── */}
        {isComplete && (
          <div className="tlm-complete-overlay" ref={celebrationRef}>
            <div className="tlm-complete-card">
              <div className="tlm-complete-emoji">🎉</div>
              <h2 className="tlm-complete-title">Board cleared!</h2>
              <p className="tlm-complete-sub">All {BOARD_SIZE} pairs matched</p>
              <div className="tlm-complete-actions">
                <button className="tlm-btn-primary" onClick={handleRestart}>
                  Play Again
                </button>
                <button
                  className="tlm-btn-secondary"
                  onClick={() => navigate(`/chapter/${chapterId}`)}
                >
                  Back to Chapter
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
