import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listeningRecallGroups,
  getGroupProgress,
  setGroupProgress,
  //MAX_COMPLETED_ROUNDS,
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

  type PlaybackMode = "normal" | "slow" | "reverse";

  // ── UI state ───────────────────────────────────────────────────────────────
  // Every visit to this page always starts at card 0 — position within a
  // round is never persisted (a round only counts if completed in one go).
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [roundsCompleted, setRoundsCompleted] = useState<number>(
    () => getGroupProgress(groupNum).completedRounds
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Playback mode remains active until the user changes it.
  // - normal: existing default sequence
  // - slow: existing sequence + extra final Normal Chinese, with pauses 1.5×
  // - reverse: Chinese (normal) → pause → English → pause → Chinese (normal)
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("normal");
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
  //
  // The sequence is built as an ordered list of actions so that Slow Mode can
  // insert an extra final Normal Chinese playback and scale every existing
  // pause by 1.5× without hard-coding a second sequence or new pause values.
  async function playFromStep(
    idx: number,
    startStep: number,
    currentCards: ListeningRecallCard[],
    mode: PlaybackMode
  ) {
    const myToken = ++playTokenRef.current;
    const shouldContinue = () =>
      myToken === playTokenRef.current && isPlayingRef.current && !isPausedRef.current;

    if (currentCards.length === 0 || idx >= currentCards.length) return;
    const card = currentCards[idx];
    const pauseScale = mode === "slow" ? 1.5 : 1;

    type Action =
      | { kind: "speak-en"; rate: number }
      | { kind: "speak-zh"; rate: number }
      | { kind: "pause"; ms: number };

    let actions: Action[];
    if (mode === "reverse") {
      // Reverse Mode sequence:
      // 1) Chinese first pass (0.2)
      // 2) Pause 2500ms
      // 3) English normal (1.0)
      // 4) Then continue normal advance flow (mode-specific pause/round-end)
      actions = [
        { kind: "speak-zh", rate: 0.2 },
        { kind: "pause", ms: 2500 },
        { kind: "speak-en", rate: 1.0 },
      ];
    } else {
      // Normal Mode: English → Slow Chinese → Normal Chinese.
      // Slow Mode: English → Slow Chinese → Normal Chinese → Normal Chinese
      // (one extra Normal Chinese playback, same existing pause durations,
      // each pause scaled by 1.5×).
      actions = [
        { kind: "speak-en", rate: 1.0 },       // 0: English at rate 1.0
        { kind: "pause", ms: 250 },            // 1: existing 250ms pause
        { kind: "speak-zh", rate: 0.3 },       // 2: Hanzi slow pass
        { kind: "pause", ms: 2000 },           // 3: existing 2000ms pause
        { kind: "speak-zh", rate: 1.0 },       // 4: Hanzi normal pass
      ];
      if (mode === "slow") {
        actions.push({ kind: "pause", ms: 750 });
        actions.push({ kind: "speak-zh", rate: 1.0 }); // extra Normal Chinese pass
      }
    }

    for (let i = startStep; i < actions.length; i++) {
      const action = actions[i];
      if (action.kind === "speak-en") {
        await speakEnglish(card.english, action.rate);
      } else if (action.kind === "speak-zh") {
        await speakChinese(card.hanzi, action.rate);
      } else {
        await sleep(action.ms * pauseScale);
      }
      if (!shouldContinue()) { stepRef.current = i + 1; return; }
      stepRef.current = i + 1;
    }

    const nextIdx = idx + 1;
    const isLastCardOfRound = nextIdx >= currentCards.length;

    // Existing pause before next card — unless this is the final card
    // of the round, in which case we speak the round-complete announcement
    // instead (right after the final audio, before resetting to card 1).
    // Normal/Slow keep their existing 1250ms (scaled in Slow Mode).
    // Reverse uses 1500ms.
    if (stepRef.current <= actions.length && !isLastCardOfRound) {
      const interCardPause = mode === "reverse" ? 1500 : 1250 * pauseScale;
      await sleep(interCardPause);
      if (!shouldContinue()) { stepRef.current = actions.length; return; }
    }

    // 7. Advance — the whole sequence for this card completed fully.
    stepRef.current = 0;
    if (isLastCardOfRound) {
      // ── Round completed (every card finished fully, automatically) ──
      // completedRounds is an uncapped lifetime counter, so the announcement
      // and display always use the actual round number (e.g. "Round 11
      // complete", "Round 17 complete"), never reset once the 10 progress
      // boxes are all filled.
      const newCount = roundsCompletedRef.current + 1;
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
      // Reverse uses 1000ms; Normal/Slow keep existing 750ms.
      await sleep(mode === "reverse" ? 1000 : 750);
      setRoundMessage(null);
      if (!shouldContinue()) return;

      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
  }

  // Auto-advance: whenever play/pause state, index, cards, or playback mode
  // change, resume playback of the current card from wherever stepRef left
  // off (mode reflects the latest toggle since it's read fresh here).
  useEffect(() => {
    if (isPlaying && !isPaused && cards.length > 0) {
      playFromStep(currentIndex, stepRef.current, cards, playbackMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, currentIndex, cards, playbackMode]);

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
  const isSlowMode = playbackMode === "slow";
  const isReverseMode = playbackMode === "reverse";

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

      {/* Playback mode toggles */}
      <div className="lrp-modes-wrap">
        <button
          className={"lrp-btn lrp-btn--slowmode" + (isSlowMode ? " active" : "")}
          onClick={() => setPlaybackMode((m) => (m === "slow" ? "normal" : "slow"))}
          aria-pressed={isSlowMode}
          aria-label="Toggle Slow Mode"
        >
          🐢 Slow Mode {isSlowMode ? "On" : "Off"}
        </button>
        <button
          className={"lrp-btn lrp-btn--slowmode" + (isReverseMode ? " active" : "")}
          onClick={() => setPlaybackMode((m) => (m === "reverse" ? "normal" : "reverse"))}
          aria-pressed={isReverseMode}
          aria-label="Toggle Reverse Mode"
        >
          🔄 Reverse Mode {isReverseMode ? "On" : "Off"}
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
