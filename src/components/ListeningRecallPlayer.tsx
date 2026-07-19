import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listeningRecallGroups,
  getGroupProgress,
  setGroupProgress,
  MAX_COMPLETED_ROUNDS,
  type ListeningRecallCard,
} from "../utils/listeningRecall";
import "./ListeningRecallPlayer.css";

export default function ListeningRecallPlayer() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const groupNum = Number(groupId ?? 0);

  const cards = useMemo(() => {
    const g = listeningRecallGroups.find((g) => g.group === groupNum);
    return g ? g.cards : [];
  }, [groupNum]);

  // ── UI state ───────────────────────────────────────────────────────────────
  // Every visit to this page always starts at card 0 — position within a
  // round is never persisted (a round only counts if completed in one go).
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [roundsCompleted, setRoundsCompleted] = useState<number>(
    () => getGroupProgress(groupNum).completedRounds
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Shown for ~2s after a round completes automatically; cleared before
  // continuing into the next round. Never set for manual skip/Stop/leaving.
  const [roundMessage, setRoundMessage] = useState<string | null>(null);

  // ── Pocket Mode state ──────────────────────────────────────────────────────
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);

  // ── Refs for one-item-at-a-time playback (avoid stale closures) ────────────
  const playTokenRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const roundsCompletedRef = useRef<number>(getGroupProgress(groupNum).completedRounds);
  const timeoutRef = useRef<number | null>(null);
  // Tracks which step of the current card's audio sequence to run next
  // (0 = English, 1 = post-English pause, 2 = slow hanzi, 3 = post-slow
  // pause, 4 = normal hanzi, 5 = post-normal pause / advance). Pausing keeps
  // this ref untouched so Play resumes from the same place; Stop and manual
  // Next/Prev reset it to 0 since they discard the in-progress step.
  const stepRef = useRef(0);

  // ── Pocket Mode refs ───────────────────────────────────────────────────────
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);

  // ── TTS helpers ────────────────────────────────────────────────────────────

  function clearPending() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, ms);
    });
  }

  function speakChinese(text: string, rate: number): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      const timer = window.setTimeout(finish, 20000);
      window.setTimeout(() => {
        if (settled) return;
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        if (speechSynthesis.paused) speechSynthesis.resume();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "zh-CN";
        utt.rate = rate;
        utt.onend = () => { clearTimeout(timer); finish(); };
        utt.onerror = () => { clearTimeout(timer); finish(); };
        speechSynthesis.speak(utt);
      }, 0);
    });
  }

  function speakEnglish(text: string, rate = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      const timer = window.setTimeout(finish, 30000);
      window.setTimeout(() => {
        if (settled) return;
        if (speechSynthesis.paused) speechSynthesis.resume();
        const voices = speechSynthesis.getVoices();
        const engVoice = voices.find((v) => v.lang.startsWith("en"));
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "en-US";
        if (engVoice) utt.voice = engVoice;
        utt.rate = rate;
        utt.onend = () => { clearTimeout(timer); finish(); };
        utt.onerror = () => { clearTimeout(timer); finish(); };
        speechSynthesis.speak(utt);
      }, 0);
    });
  }

  // ── Play one card's sequence starting at a given step, then advance ────────
  // Resumable so that Pause/Play can stop and continue from the same place
  // in the sequence instead of restarting the card from the beginning.
  async function playFromStep(idx: number, startStep: number, currentCards: ListeningRecallCard[]) {
    const myToken = ++playTokenRef.current;
    const shouldContinue = () =>
      myToken === playTokenRef.current && isPlayingRef.current && !isPausedRef.current;

    if (currentCards.length === 0 || idx >= currentCards.length) return;
    const card = currentCards[idx];
    let step = startStep;

    // 1. English at rate 1.0
    if (step <= 0) {
      await speakEnglish(card.english, 1.0);
      if (!shouldContinue()) { stepRef.current = 1; return; }
      step = 1;
      stepRef.current = step;
    }

    // 2. 250ms pause
    if (step <= 1) {
      await sleep(250);
      if (!shouldContinue()) { stepRef.current = 2; return; }
      step = 2;
      stepRef.current = step;
    }

    // 3. Hanzi slow pass (rate 0.3)
    if (step <= 2) {
      await speakChinese(card.hanzi, 0.3);
      if (!shouldContinue()) { stepRef.current = 3; return; }
      step = 3;
      stepRef.current = step;
    }

    // 4. 2000ms pause
    if (step <= 3) {
      await sleep(2000);
      if (!shouldContinue()) { stepRef.current = 4; return; }
      step = 4;
      stepRef.current = step;
    }

    // 5. Hanzi normal pass (rate 1.0)
    if (step <= 4) {
      await speakChinese(card.hanzi, 1.0);
      if (!shouldContinue()) { stepRef.current = 5; return; }
      step = 5;
      stepRef.current = step;
    }

    const nextIdx = idx + 1;
    const isLastCardOfRound = nextIdx >= currentCards.length;

    // 6. Pause before next card — unless this is the final card of the
    // round, in which case we speak the round-complete announcement instead
    // (right after the final Chinese audio, before resetting to card 1).
    if (step <= 5 && !isLastCardOfRound) {
      await sleep(1250);
      if (!shouldContinue()) { stepRef.current = 5; return; }
    }

    // 7. Advance — the whole sequence for this card completed fully.
    stepRef.current = 0;
    if (isLastCardOfRound) {
      // ── Round completed (every card finished fully, automatically) ──
      const newCount = Math.min(MAX_COMPLETED_ROUNDS, roundsCompletedRef.current + 1);
      roundsCompletedRef.current = newCount;
      setGroupProgress(groupNum, { completedRounds: newCount });
      setRoundsCompleted(newCount);

      // Show "Round X complete" on screen and speak it aloud using the same
      // speech system as the rest of the sequence. speakEnglish() is awaited
      // fully here — since nothing else calls speechSynthesis.speak() until
      // this promise resolves, the announcement cannot be cut off by the
      // next round's card audio starting (important on mobile Safari, where
      // a new speak() call cancels any utterance still in flight).
      setRoundMessage(`Round ${newCount} complete`);
      await speakEnglish(`Round ${newCount} complete.`, 1.0);
      if (!shouldContinue()) { setRoundMessage(null); return; }

      // Brief pause after the announcement before starting the next round.
      await sleep(750);
      setRoundMessage(null);
      if (!shouldContinue()) return;

      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
  }

  // Auto-advance: whenever play/pause state, index, or cards change, resume
  // playback of the current card from wherever stepRef left off.
  useEffect(() => {
    if (isPlaying && !isPaused && cards.length > 0) {
      playFromStep(currentIndex, stepRef.current, cards);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, currentIndex, cards]);

  // ── Controls ───────────────────────────────────────────────────────────────

  function stopAudio() {
    playTokenRef.current++; // invalidate any in-flight sequence
    clearPending();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  const handlePlay = () => {
    if (isPlayingRef.current && !isPausedRef.current) return; // already running
    // If resuming from Pause, stepRef still holds the place to continue from.
    // If starting fresh (not previously playing), stepRef is already 0.
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    stopAudio(); // cancel current speech/timer, but keep stepRef so Play can resume here
    isPausedRef.current = true;
    setIsPaused(true);
    // isPlaying stays true — the session is still active, just paused.
  };

  const handleStop = () => {
    stopAudio();
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setRoundMessage(null);
    // Stopping mid-round never awards a round and never persists position —
    // the in-progress round's position is discarded and the group resets to
    // card 0 for the next play.
    stepRef.current = 0;
    setCurrentIndex(0);
  };

  const handleNext = () => {
    stopAudio(); // invalidate any in-flight sequence & cancel current speech
    stepRef.current = 0; // navigating starts the destination card from the beginning
    setRoundMessage(null);

    const nextIdx = currentIndex + 1;
    if (nextIdx >= cards.length) {
      // Manual skip from the final card: no round credit
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
  };

  const handlePrev = () => {
    stopAudio();
    stepRef.current = 0; // navigating starts the destination card from the beginning
    setRoundMessage(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // ── Pocket Mode helpers ────────────────────────────────────────────────────
  const enterPocketMode = async () => {
    if (!isPlayingRef.current || isPausedRef.current) {
      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
    }
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
        setWakeLockSupported(true);
      } catch {
        setWakeLockSupported(false);
      }
    } else {
      setWakeLockSupported(false);
    }
    setIsPocketMode(true);
  };

  const exitPocketMode = () => {
    setIsPocketMode(false);
    setHoldProgress(0);
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const handleHoldStart = () => {
    holdStartRef.current = Date.now();
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - (holdStartRef.current ?? Date.now());
      const pct = Math.min(100, (elapsed / 3000) * 100);
      setHoldProgress(pct);
      if (elapsed >= 3000) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        exitPocketMode();
      }
    }, 30);
  };

  const handleHoldEnd = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      isPausedRef.current = false;
      playTokenRef.current++;
      clearPending();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const handleBack = () => {
    handleStop();
    navigate("/listening-recall");
  };

  if (cards.length === 0) {
    return (
      <div className="lrp-page">
        <div className="lrp-header">
          <button className="lrp-back-btn" onClick={handleBack}>← Back</button>
          <h1 className="lrp-title">Group {groupNum} — Listening Recall</h1>
        </div>
        <p className="lrp-empty">No cards found for this group.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex] ?? null;

  return (
    <div className="lrp-page">
      {/* Pocket Mode overlay */}
      {isPocketMode && (
        <div className="lrp-pocket-overlay">
          <div className="lrp-pocket-info">
            <div className="lrp-pocket-label">Pocket Mode</div>
            <div className="lrp-pocket-deck">Group {groupNum} — Listening Recall</div>
            <div className="lrp-pocket-counter">
              Card {currentIndex + 1} of {cards.length}
            </div>
            <div className="lrp-pocket-rounds">
              Rounds completed: {roundsCompleted}
            </div>
            {!wakeLockSupported && (
              <div className="lrp-pocket-wake-warning">
                Keep-awake not supported on this device. You may need to set
                Auto-Lock to Never.
              </div>
            )}
          </div>
          <button
            className="lrp-pocket-unlock-btn"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            style={{
              background: `conic-gradient(rgba(255,255,255,0.9) ${holdProgress * 3.6}deg, rgba(255,255,255,0.15) 0deg)`
            }}
          >
            <span className="lrp-pocket-unlock-inner">
              Hold 3s<br />to unlock
            </span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="lrp-header">
        <button className="lrp-back-btn" onClick={handleBack}>← Back</button>
        <h1 className="lrp-title">Group {groupNum} — Listening Recall</h1>
      </div>

      {/* Progress */}
      <div className="lrp-progress">
        <span>Card {currentIndex + 1} of {cards.length}</span>
        <span>Rounds completed: {roundsCompleted}</span>
      </div>

      {/* Card */}
      {roundMessage ? (
        <div className="lrp-card lrp-round-message">
          <div className="lrp-round-message-text">{roundMessage}</div>
        </div>
      ) : currentCard && (
        <div className="lrp-card">
          <div className="lrp-english">{currentCard.english}</div>
          <div className="lrp-hanzi">{currentCard.hanzi}</div>
          <div className="lrp-pinyin">{currentCard.pinyin}</div>
        </div>
      )}

      {/* Controls */}
      <div className="lrp-controls">
        <button
          className="lrp-btn lrp-btn--nav"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous"
        >
          ◀ Prev
        </button>

        {!isPlaying || isPaused ? (
          <button className="lrp-btn lrp-btn--play" onClick={handlePlay} aria-label="Play">
            ▶ Play
          </button>
        ) : (
          <button className="lrp-btn lrp-btn--pause" onClick={handlePause} aria-label="Pause">
            ⏸ Pause
          </button>
        )}

        <button className="lrp-btn lrp-btn--stop" onClick={handleStop} aria-label="Stop">
          ⏹ Stop
        </button>

        <button className="lrp-btn lrp-btn--nav" onClick={handleNext} aria-label="Next">
          Next ▶
        </button>
      </div>

      {/* Pocket Mode button */}
      <div className="lrp-pocket-wrap">
        <button className="lrp-btn lrp-btn--pocket" onClick={enterPocketMode}>
          🌙 Pocket Mode
        </button>
      </div>
    </div>
  );
}
