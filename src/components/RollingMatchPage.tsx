import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getAllDecks } from "../utils/decks";
import { saveBestTime, markDeckComplete } from "../utils/deckProgress";
import "./RollingMatchPage.css";

const POOL_SIZE = 20;
const PAGE_SIZE = 5;

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

interface SlotState {
  id: string;
  cleared: boolean;
}

function buildCardPool(chapter: number): MatchItem[] {
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
  return shuffleArray(filtered).slice(0, POOL_SIZE).map((card) => ({
    id: card.id,
    promptLine: card.promptLine,
    english: card.choices[card.correct],
  }));
}

function buildPageSlots(pageCards: MatchItem[]): {
  leftSlots: SlotState[];
  rightSlots: SlotState[];
} {
  const leftSlots: SlotState[] = pageCards.map((c) => ({ id: c.id, cleared: false }));
  const rightSlots: SlotState[] = shuffleArray(
    pageCards.map((c) => ({ id: c.id, cleared: false }))
  );
  return { leftSlots, rightSlots };
}

function speakHanzi(hanzi: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(hanzi);
  u.lang = "zh-CN";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function RollingMatchPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chapter = chapterId ? Number(chapterId) : 1;

  // When launched from a match-deck tile these are set via navigate state
  const deckId: string | undefined = location.state?.deckId;
  const returnTo: string | undefined = location.state?.returnTo;

  const [gameKey, setGameKey] = useState(0);
  const [cards, setCards] = useState<MatchItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [leftSlots, setLeftSlots] = useState<SlotState[]>([]);
  const [rightSlots, setRightSlots] = useState<SlotState[]>([]);

  // Selection (by slot index, not id)
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);

  // Flash feedback
  const [flashLeft, setFlashLeft] = useState<number | null>(null);
  const [flashRight, setFlashRight] = useState<number | null>(null);
  const [flashType, setFlashType] = useState<"correct" | "wrong" | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const [matchedCount, setMatchedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("qc_match_sound");
      return v === null ? true : v === "true";
    } catch {
      return true;
    }
  });

  const timerRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const pageTransitionRef = useRef<number | null>(null);

  // ── Initialize / restart ──────────────────────────────────────────────────
  useEffect(() => {
    const pool = buildCardPool(chapter);
    setCards(pool);
    setPageIndex(0);
    setMatchedCount(0);
    setElapsed(0);
    setIsComplete(false);
    setSelectedLeft(null);
    setSelectedRight(null);
    setFlashLeft(null);
    setFlashRight(null);
    setFlashType(null);
    setIsFlashing(false);

    if (pool.length > 0) {
      const { leftSlots: ls, rightSlots: rs } = buildPageSlots(pool.slice(0, PAGE_SIZE));
      setLeftSlots(ls);
      setRightSlots(rs);
    } else {
      setLeftSlots([]);
      setRightSlots([]);
    }

    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
      if (flashTimeoutRef.current !== null) { clearTimeout(flashTimeoutRef.current); flashTimeoutRef.current = null; }
      if (pageTransitionRef.current !== null) { clearTimeout(pageTransitionRef.current); pageTransitionRef.current = null; }
    };
  }, [chapter, gameKey]);

  // ── Auto-advance when all slots on current page are cleared ──────────────
  useEffect(() => {
    if (leftSlots.length === 0) return;
    if (!leftSlots.every((s) => s.cleared)) return;
    if (pageTransitionRef.current !== null) return;

    const totalPages = Math.ceil(cards.length / PAGE_SIZE);
    const nextPage = pageIndex + 1;

    if (nextPage >= totalPages) {
      setIsComplete(true);
      if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    } else {
      pageTransitionRef.current = window.setTimeout(() => {
        const start = nextPage * PAGE_SIZE;
        const pageCards = cards.slice(start, start + PAGE_SIZE);
        const { leftSlots: ls, rightSlots: rs } = buildPageSlots(pageCards);
        setLeftSlots(ls);
        setRightSlots(rs);
        setPageIndex(nextPage);
        setSelectedLeft(null);
        setSelectedRight(null);
        pageTransitionRef.current = null;
      }, 200);
    }
  }, [leftSlots, pageIndex, cards]);

  // ── Match handling ────────────────────────────────────────────────────────
  const handleMatch = (li: number, ri: number) => {
    if (isFlashing) return;
    const lSlot = leftSlots[li];
    const rSlot = rightSlots[ri];
    if (!lSlot || !rSlot || lSlot.cleared || rSlot.cleared) return;

    setSelectedLeft(null);
    setSelectedRight(null);

    if (lSlot.id === rSlot.id) {
      // ── Correct ──
      setIsFlashing(true);
      setFlashLeft(li);
      setFlashRight(ri);
      setFlashType("correct");

      // Speech — called synchronously from click event so iOS permits it
      if (soundOn) {
        const card = cards.find((c) => c.id === lSlot.id);
        if (card) {
          const sepIdx = card.promptLine.indexOf(" — ");
          const hanzi = sepIdx !== -1 ? card.promptLine.slice(sepIdx + 3) : card.promptLine;
          speakHanzi(hanzi);
        }
      }

      flashTimeoutRef.current = window.setTimeout(() => {
        setLeftSlots((prev) => {
          const next = [...prev];
          next[li] = { ...next[li], cleared: true };
          return next;
        });
        setRightSlots((prev) => {
          const next = [...prev];
          next[ri] = { ...next[ri], cleared: true };
          return next;
        });
        setMatchedCount((prev) => prev + 1);
        setFlashLeft(null);
        setFlashRight(null);
        setFlashType(null);
        setIsFlashing(false);
        flashTimeoutRef.current = null;
      }, 250);
    } else {
      // ── Wrong ──
      setIsFlashing(true);
      setFlashLeft(li);
      setFlashRight(ri);
      setFlashType("wrong");

      flashTimeoutRef.current = window.setTimeout(() => {
        setFlashLeft(null);
        setFlashRight(null);
        setFlashType(null);
        setIsFlashing(false);
        flashTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleSelectLeft = (i: number) => {
    if (isFlashing) return;
    if (leftSlots[i]?.cleared) return;
    if (selectedRight !== null) {
      handleMatch(i, selectedRight);
    } else if (selectedLeft === i) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(i);
    }
  };

  const handleSelectRight = (i: number) => {
    if (isFlashing) return;
    if (rightSlots[i]?.cleared) return;
    if (selectedLeft !== null) {
      handleMatch(selectedLeft, i);
    } else if (selectedRight === i) {
      setSelectedRight(null);
    } else {
      setSelectedRight(i);
    }
  };

  // ── Save best time on completion ─────────────────────────────────────────
  useEffect(() => {
    if (!isComplete || elapsed === 0) return;

    // Always save the chapter-level rolling best time (for the bonus button display)
    const key = `rollingBestTime_ch${chapterId}`;
    try {
      const prev = localStorage.getItem(key);
      const prevTime = prev ? parseInt(prev, 10) : null;
      if (prevTime === null || elapsed < prevTime) {
        localStorage.setItem(key, String(elapsed));
      }
    } catch { /* ignore */ }

    // When launched from a match-deck tile, persist per-deck best time and completion
    if (deckId) {
      saveBestTime(deckId, elapsed);
      markDeckComplete(deckId);
    }
  }, [isComplete, elapsed, chapterId, deckId]);

  const handleRestart = () => setGameKey((k) => k + 1);

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      try { localStorage.setItem("qc_match_sound", String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const totalCards = cards.length;
  const totalPages = totalCards > 0 ? Math.ceil(totalCards / PAGE_SIZE) : 0;
  const hasNoCards = totalCards === 0;

  // Build id→card lookup for render
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="rm-page">
      <div className="rm-shell">

        {/* ── Header ── */}
        <div className="rm-header">
          <button
            className="rm-back-btn"
            onClick={() => navigate(returnTo ?? `/chapter/${chapterId}`)}
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
            <span className="rm-title">Match</span>
            <span className="rm-subtitle">{deckId ? `Match · Ch ${chapter}` : `Chapter ${chapter}`}</span>
          </div>

          <div className="rm-header-right">
            <span className="rm-timer">{formatTime(elapsed)}</span>
            <span className="rm-progress">
              {matchedCount}
              <span className="rm-progress-sep">/</span>
              {totalCards || "—"}
            </span>
          </div>

          <button
            className="rm-sound-btn"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            title={soundOn ? "Sound on" : "Sound off"}
          >
            {soundOn ? "🔈" : "🔇"}
          </button>
        </div>

        {/* ── Empty state ── */}
        {hasNoCards && !isComplete && (
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

        {/* ── Page indicator ── */}
        {!hasNoCards && !isComplete && totalPages > 1 && (
          <div className="rm-page-indicator">
            Page {pageIndex + 1} / {totalPages}
          </div>
        )}

        {/* ── Game board ── */}
        {!hasNoCards && !isComplete && (
          <div className="rm-board">
            <div className="rm-col-label">Chinese</div>
            <div className="rm-col-label">English</div>

            {Array.from({ length: PAGE_SIZE }, (_, i) => {
              const lSlot = leftSlots[i];
              const rSlot = rightSlots[i];
              const isLCleared = !lSlot || lSlot.cleared;
              const isRCleared = !rSlot || rSlot.cleared;

              const isLFlashCorrect = flashLeft === i && flashType === "correct";
              const isRFlashCorrect = flashRight === i && flashType === "correct";
              const isLFlashWrong = flashLeft === i && flashType === "wrong";
              const isRFlashWrong = flashRight === i && flashType === "wrong";
              const isLSelected = selectedLeft === i && !isLCleared;
              const isRSelected = selectedRight === i && !isRCleared;

              let lClass = "rm-card";
              if (isLCleared) lClass += " rm-cleared";
              else if (isLFlashCorrect) lClass += " rm-correct";
              else if (isLFlashWrong) lClass += " rm-wrong";
              else if (isLSelected) lClass += " rm-selected";

              let rClass = "rm-card";
              if (isRCleared) rClass += " rm-cleared";
              else if (isRFlashCorrect) rClass += " rm-correct";
              else if (isRFlashWrong) rClass += " rm-wrong";
              else if (isRSelected) rClass += " rm-selected";

              const lCard = lSlot && !isLCleared ? cardById.get(lSlot.id) : undefined;
              const sepIdx = lCard ? lCard.promptLine.indexOf(" — ") : -1;
              const pinyin = lCard
                ? sepIdx !== -1 ? lCard.promptLine.slice(0, sepIdx) : lCard.promptLine
                : "";
              const hanzi = lCard
                ? sepIdx !== -1 ? lCard.promptLine.slice(sepIdx + 3) : ""
                : "";

              const rCard = rSlot && !isRCleared ? cardById.get(rSlot.id) : undefined;

              return (
                <Fragment key={i}>
                  <button
                    className={lClass}
                    onClick={() => handleSelectLeft(i)}
                    disabled={isLCleared || isFlashing}
                    tabIndex={isLCleared ? -1 : 0}
                  >
                    {!isLCleared && (
                      <>
                        <span className="rm-prompt">{pinyin}</span>
                        {hanzi && (
                          <span className="rm-prompt rm-prompt-hanzi">{hanzi}</span>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    className={rClass}
                    onClick={() => handleSelectRight(i)}
                    disabled={isRCleared || isFlashing}
                    tabIndex={isRCleared ? -1 : 0}
                  >
                    {!isRCleared && rCard && (
                      <span className="rm-english">{rCard.english}</span>
                    )}
                  </button>
                </Fragment>
              );
            })}
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
                {totalCards} cards matched
              </p>
              <div className="rm-complete-actions">
                <button className="rm-btn-primary" onClick={handleRestart}>
                  Play Again
                </button>
                <button
                  className="rm-btn-secondary"
                  onClick={() => navigate(returnTo ?? `/chapter/${chapterId}`)}
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
