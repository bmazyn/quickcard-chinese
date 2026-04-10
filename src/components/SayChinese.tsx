/**
 * SayChinese.tsx
 *
 * "Say Chinese" bonus game mode.
 *
 * Round flow:
 *  1. Build 10 random vocab items for the chapter.
 *  2. Each card shows English + Hanzi (pinyin hidden).
 *  3. User taps the mic button and says the Chinese word.
 *  4. Speech is compared to the vocab item's hanzi / pinyin.
 *  5. After each attempt: reveal pinyin, show correct/wrong, optionally
 *     replay audio via speech synthesis.
 *  6. Summary screen at the end.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getAllDecks } from "../utils/decks";
import {
  extractVocabForChapter,
  buildRound,
  checkSpeechAnswer,
  saveSayChineseResult,
  getSayChineseBest,
  ROUND_SIZE,
  type VocabItem,
  type SpeechCheckResult,
} from "../utils/sayChinese";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import "./SayChinese.css";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * "prompt"    – showing English + Hanzi, waiting for user to tap mic
 * "listening" – mic is open
 * "processing"– audio captured, waiting for transcript
 * "reveal"    – result received, showing feedback (pinyin, ✓ / ✗)
 */
type CardPhase = "prompt" | "listening" | "processing" | "reveal";

type GamePhase = "playing" | "done";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SayChinese() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const chapter = chapterId ? Number(chapterId) : 1;

  // ── Round state ──────────────────────────────────────────────────────────
  const [gameKey, setGameKey]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [noCards, setNoCards]       = useState(false);
  const [round, setRound]           = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardPhase, setCardPhase]   = useState<CardPhase>("prompt");
  const [gamePhase, setGamePhase]   = useState<GamePhase>("playing");
  const [correct, setCorrect]       = useState(0);
  const [misses, setMisses]         = useState(0);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  // Full debug info from the last speech check — always shown in the reveal panel
  const [lastCheckResult, setLastCheckResult] = useState<SpeechCheckResult | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Speech synthesis (audio replay) ─────────────────────────────────────
  const playHanziAudio = useCallback((hanzi: string) => {
    if (!hanzi || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(hanzi);
    utterance.lang = "zh-CN";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Speech recognition ───────────────────────────────────────────────────
  const handleSpeechResult = useCallback(
    (raw: string) => {
      setLastTranscript(raw);

      const card = round[currentIndex];
      if (!card) return;

      const result = checkSpeechAnswer(raw, card.hanzi, card.pinyin);
      setLastCheckResult(result);

      if (result.isCorrect) {
        setCorrect((c) => c + 1);
        setLastResult("correct");
      } else {
        setMisses((m) => m + 1);
        setLastResult("wrong");
      }

      setCardPhase("reveal");

      // Auto-play the hanzi pronunciation after answering
      audioTimerRef.current = setTimeout(() => {
        playHanziAudio(card.hanzi);
        audioTimerRef.current = null;
      }, 180);
    },
    [round, currentIndex, playHanziAudio]
  );

  const handleSpeechError = useCallback(
    (msg: string) => {
      console.warn("[SayChinese] speech error:", msg);
      // "no-speech" and "aborted" are non-fatal; just reset to prompt.
      if (msg === "no-speech" || msg === "aborted") {
        setCardPhase("prompt");
        return;
      }
      // Other errors (not-allowed, network, etc.) — show as reveal with wrong
      setMisses((m) => m + 1);
      setLastResult("wrong");
      setLastTranscript("");
      setCardPhase("reveal");
    },
    []
  );

  const {
    isSupported,
    status: speechStatus,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: "zh-CN",
    onResult: handleSpeechResult,
    onError: handleSpeechError,
  });

  // Sync cardPhase with speech status transitions
  useEffect(() => {
    if (speechStatus === "listening") setCardPhase("listening");
    if (speechStatus === "processing") setCardPhase("processing");
  }, [speechStatus]);

  // ── Build round on mount / restart ──────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    if (audioTimerRef.current) { clearTimeout(audioTimerRef.current); audioTimerRef.current = null; }
    stopListening();

    const allCards = quizCardsData as QuizCard[];
    const chapterDeckIds = new Set(
      getAllDecks()
        .filter((d) => d.chapter === chapter)
        .map((d) => d.deckId)
    );

    const vocab = extractVocabForChapter(allCards, chapterDeckIds);

    if (vocab.length === 0) {
      setNoCards(true);
      setLoading(false);
      return;
    }

    const r = buildRound(vocab, ROUND_SIZE);
    setRound(r);
    setNoCards(false);
    setCurrentIndex(0);
    setCardPhase("prompt");
    setGamePhase("playing");
    setCorrect(0);
    setMisses(0);
    setLastResult(null);
    setLastTranscript("");
    setLastCheckResult(null);
    setLoading(false);
  }, [chapter, gameKey, stopListening]);

  // ── Persist best on round end ────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== "done" || round.length === 0) return;
    saveSayChineseResult(chapter, { correct, total: round.length });
  }, [gamePhase, correct, round.length, chapter]);

  // ── Cleanup timers on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
      window.speechSynthesis?.cancel();
      stopListening();
    };
  }, [stopListening]);

  // ── Advance to next card ─────────────────────────────────────────────────
  const advanceCard = useCallback(
    (fromIndex: number) => {
      const nextIndex = fromIndex + 1;
      if (nextIndex >= round.length) {
        setGamePhase("done");
      } else {
        setCurrentIndex(nextIndex);
        setCardPhase("prompt");
        setLastResult(null);
        setLastTranscript("");
        setLastCheckResult(null);
      }
    },
    [round.length]
  );

  const handleContinue = useCallback(() => {
    if (cardPhase !== "reveal") return;
    advanceCard(currentIndex);
  }, [cardPhase, currentIndex, advanceCard]);

  const handleMicPress = useCallback(() => {
    if (!isSupported) return;
    if (cardPhase !== "prompt") return;
    startListening();
  }, [isSupported, cardPhase, startListening]);

  const handleRestart = () => {
    stopListening();
    setGameKey((k) => k + 1);
  };

  const handleBack = () => navigate(`/chapter/${chapter}`);

  // ── Helpers for per-card best score ─────────────────────────────────────
  const best = getSayChineseBest(chapter);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="sc-page">
        <div className="sc-shell">
          <ScHeader chapter={chapter} onBack={handleBack} />
          <div className="sc-loading">
            <span className="sc-loading-icon">🎤</span>
            <span className="sc-loading-text">Loading vocab…</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Unsupported browser
  // ─────────────────────────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="sc-page">
        <div className="sc-shell">
          <ScHeader chapter={chapter} onBack={handleBack} />
          <div className="sc-unsupported">
            <span className="sc-unsupported-icon">🚫</span>
            <h2 className="sc-unsupported-title">Microphone not available</h2>
            <p className="sc-unsupported-msg">
              Your browser doesn't support speech recognition.
              <br />
              Try Chrome, Edge, or Safari on iOS 14.5+.
            </p>
            <button className="sc-btn-secondary" onClick={handleBack}>← Back to Chapter</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state
  // ─────────────────────────────────────────────────────────────────────────
  if (noCards) {
    return (
      <div className="sc-page">
        <div className="sc-shell">
          <ScHeader chapter={chapter} onBack={handleBack} />
          <div className="sc-empty">
            <span className="sc-empty-icon">📭</span>
            <p className="sc-empty-msg">
              No vocab cards found for Chapter {chapter}.<br />
              Try a different chapter.
            </p>
            <button className="sc-btn-secondary" onClick={handleBack}>← Back to Chapter</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Done / summary screen
  // ─────────────────────────────────────────────────────────────────────────
  if (gamePhase === "done") {
    const total = round.length;
    const perfect = misses === 0;
    return (
      <div className="sc-page">
        <div className="sc-shell">
          <ScHeader chapter={chapter} onBack={handleBack} />
          <div className="sc-done">
            <div className="sc-done-emoji">
              {perfect ? "🏆" : misses <= 2 ? "⭐" : "🎤"}
            </div>
            <h2 className="sc-done-title">
              {perfect ? "Perfect Round!" : "Round Complete"}
            </h2>
            <p className="sc-done-goal">
              {perfect
                ? `You said all ${total} correctly!`
                : `Can you say all ${total} with 0 misses?`}
            </p>

            <div className="sc-done-stats">
              <div className="sc-done-stat">
                <span className="sc-done-stat-value sc-done-stat-correct">
                  {correct}/{total}
                </span>
                <span className="sc-done-stat-label">Correct</span>
              </div>
              <div className="sc-done-stat-divider" />
              <div className="sc-done-stat">
                <span className={`sc-done-stat-value ${misses > 0 ? "sc-done-stat-miss" : "sc-done-stat-correct"}`}>
                  {misses}
                </span>
                <span className="sc-done-stat-label">Misses</span>
              </div>
              {best && (
                <>
                  <div className="sc-done-stat-divider" />
                  <div className="sc-done-stat">
                    <span className="sc-done-stat-value sc-done-stat-best">
                      {best.correct}/{best.total}
                    </span>
                    <span className="sc-done-stat-label">Best</span>
                  </div>
                </>
              )}
            </div>

            <div className="sc-done-actions">
              <button className="sc-btn-primary" onClick={handleRestart}>
                🔄 New Round
              </button>
              <button className="sc-btn-secondary" onClick={handleBack}>
                ← Back to Chapter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Playing
  // ─────────────────────────────────────────────────────────────────────────
  const card = round[currentIndex];
  const cardNum = currentIndex + 1;
  const total = round.length;

  const cardMod =
    cardPhase === "reveal" && lastResult === "correct"
      ? "sc-card--correct"
      : cardPhase === "reveal" && lastResult === "wrong"
      ? "sc-card--wrong"
      : "";

  return (
    <div className="sc-page">
      <div className="sc-shell">
        {/* ── Header ── */}
        <ScHeader
          chapter={chapter}
          onBack={handleBack}
          progress={{ current: cardNum, total }}
        />

        {/* ── Stats bar ── */}
        <div className="sc-stats-bar">
          <span className="sc-stat-item sc-stat-correct">✓ {correct}</span>
          <span className="sc-stat-divider" />
          <span className="sc-stat-item sc-stat-miss">✗ {misses}</span>
        </div>

        {/* ── Card area ── */}
        <div className="sc-card-area">
          <div className={`sc-card ${cardMod}`}>
            {/* English */}
            <div className="sc-english">{card.english}</div>

            {/* Hanzi */}
            <div
              className="sc-hanzi"
              onClick={() => playHanziAudio(card.hanzi)}
              role="button"
              tabIndex={0}
              aria-label={`Replay pronunciation of ${card.hanzi}`}
              title="Tap to replay audio"
            >
              {card.hanzi}
            </div>

            {/* Pinyin — hidden until reveal */}
            <div
              className={`sc-pinyin ${cardPhase === "reveal" ? "sc-pinyin--visible" : "sc-pinyin--hidden"}`}
              aria-hidden={cardPhase !== "reveal"}
            >
              {card.pinyin}
            </div>
          </div>

          {/* ── Mic button area ── */}
          {cardPhase === "prompt" && (
            <div className="sc-mic-area">
              <button
                className="sc-mic-btn"
                onClick={handleMicPress}
                aria-label="Tap to speak"
              >
                <MicIcon />
              </button>
              <span className="sc-mic-hint">Tap to speak</span>
            </div>
          )}

          {/* ── Listening state ── */}
          {(cardPhase === "listening" || cardPhase === "processing") && (
            <div className="sc-listening-area">
              <div className="sc-listening-ring">
                <MicIcon />
              </div>
              <span className="sc-listening-label">
                {cardPhase === "listening" ? "Listening…" : "Processing…"}
              </span>
              <button
                className="sc-cancel-btn"
                onClick={stopListening}
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Reveal area ── */}
          {cardPhase === "reveal" && (
            <div className="sc-reveal-area">
              {/* What browser heard */}
              {lastTranscript ? (
                <div className={`sc-heard-box ${lastResult === "correct" ? "sc-heard-box--correct" : "sc-heard-box--wrong"}`}>
                  <span className="sc-heard-label">You said</span>
                  <span className="sc-heard-text">"{lastTranscript}"</span>
                </div>
              ) : (
                <div className="sc-heard-box sc-heard-box--wrong">
                  <span className="sc-heard-label">You said</span>
                  <span className="sc-heard-text sc-heard-text--empty">nothing heard</span>
                </div>
              )}

              {/* Result badge */}
              <div className={`sc-result-badge ${lastResult === "correct" ? "sc-result-badge--correct" : "sc-result-badge--wrong"}`}>
                {lastResult === "correct" ? "✓ Correct!" : "✗ Not quite"}
              </div>

              {/* Debug panel — always visible so you can diagnose on any device */}
              {lastCheckResult && (
                <div className="sc-debug-panel">
                  <div className="sc-debug-row">
                    <span className="sc-debug-key">raw</span>
                    <span className="sc-debug-val">{lastTranscript || "—"}</span>
                  </div>
                  <div className="sc-debug-row">
                    <span className="sc-debug-key">normalized</span>
                    <span className="sc-debug-val">{lastCheckResult.normalizedSpeech || "—"}</span>
                  </div>
                  <div className="sc-debug-row">
                    <span className="sc-debug-key">path</span>
                    <span className="sc-debug-val sc-debug-path">{lastCheckResult.matchPath}</span>
                  </div>
                  <div className="sc-debug-row sc-debug-row--sep" />
                  <div className="sc-debug-row">
                    <span className="sc-debug-key">expected 汉字</span>
                    <span className="sc-debug-val">{lastCheckResult.expectedHanzi}</span>
                  </div>
                  <div className="sc-debug-row">
                    <span className="sc-debug-key">expected pīnyīn</span>
                    <span className="sc-debug-val">{lastCheckResult.expectedNormalizedPinyin}</span>
                  </div>
                </div>
              )}

              {/* Replay audio button */}
              <button
                className="sc-replay-btn"
                onClick={() => playHanziAudio(card.hanzi)}
                aria-label={`Replay pronunciation of ${card.hanzi}`}
              >
                🔊 Hear it again
              </button>

              {/* Continue */}
              <button
                className="sc-continue-btn"
                onClick={handleContinue}
                autoFocus
              >
                {currentIndex + 1 >= round.length ? "See Results →" : "Continue →"}
              </button>
            </div>
          )}
        </div>

        {/* (old dev-only strip removed — debug panel is now inside the reveal area) */}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScHeader({
  chapter,
  onBack,
  progress,
}: {
  chapter: number;
  onBack: () => void;
  progress?: { current: number; total: number };
}) {
  return (
    <header className="sc-header">
      <button className="sc-back-btn" onClick={onBack} aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="sc-header-center">
        <span className="sc-title">Say Chinese</span>
        <span className="sc-subtitle">Chapter {chapter}</span>
      </div>

      {progress ? (
        <div className="sc-progress-badge">
          <span className="sc-progress-num">{progress.current}</span>
          <span className="sc-progress-sep">/</span>
          <span className="sc-progress-total">{progress.total}</span>
        </div>
      ) : (
        <div className="sc-header-right-spacer" />
      )}
    </header>
  );
}

function MicIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
