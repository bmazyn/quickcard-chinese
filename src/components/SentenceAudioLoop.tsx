import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import "./SentenceAudioLoop.css";

interface SentenceCard {
  id: string;
  set: number;
  english: string;
  targetHanzi: string;
  targetPinyin: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceAudioLoop() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();
  const setNum = Number(setId ?? 1);

  const allSentences = useMemo(
    () => (sentencesRaw as SentenceCard[]).filter((s) => s.set === setNum),
    [setNum]
  );

  // ── localStorage key ───────────────────────────────────────────────────────
  const storageKey = `sentenceAudioLoopsCompleted_set${setNum}`;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState<SentenceCard[]>(() => shuffle(allSentences));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loopsCompleted, setLoopsCompleted] = useState<number>(() => {
    const saved = localStorage.getItem(`sentenceAudioLoopsCompleted_set${setNum}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ── Pocket Mode state ──────────────────────────────────────────────────────
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);

  // ── Refs for one-item-at-a-time playback (avoid stale closures) ────────────
  // playTokenRef: incremented each time a new item's playback sequence starts.
  // A stale in-flight sequence checks this and bails out if it no longer matches.
  const playTokenRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const loopsCompletedRef = useRef<number>(
    parseInt(localStorage.getItem(storageKey) ?? "0", 10) || 0
  );
  const timeoutRef = useRef<number | null>(null);

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

  function speakChinese(text: string, rate = 0.85): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      // Generous fallback: if onend never fires (iOS bug), continue anyway
      const timer = window.setTimeout(finish, 20000);
      // setTimeout(0) forces speak() into a macrotask — required on iOS Safari
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

  function speakEnglish(text: string, rate = 0.9): Promise<void> {
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

  // ── Play one sentence, then advance (one item at a time) ───────────────────
  // Mirrors the Chapter Audio Loop pattern: play the current sentence fully,
  // then hand off to React state (setCurrentIndex / setQueue) so a fresh effect
  // invocation starts the next item. iOS Safari's speechSynthesis can silently
  // ignore later speak() calls when they're chained deep inside one long-lived
  // async/await loop — starting each item from a brand-new function call
  // (triggered by an effect, not a recursive await) avoids that.
  async function playCurrentSentence(idx: number, currentQueue: SentenceCard[]) {
    const myToken = ++playTokenRef.current;
    const shouldContinue = () =>
      myToken === playTokenRef.current &&
      isPlayingRef.current &&
      !isPausedRef.current;

    if (currentQueue.length === 0 || idx >= currentQueue.length) return;
    const card = currentQueue[idx];

    // 1. Speak targetHanzi in Chinese (slower first pass, per A/B test request)
    await speakChinese(card.targetHanzi, 0.75);
    if (!shouldContinue()) return;

    // 2. 0.5s pause
    await sleep(500);
    if (!shouldContinue()) return;

    // 3. Speak English at normal rate
    await speakEnglish(card.english, 1.0);
    if (!shouldContinue()) return;

    // 4. 0.25s pause
    await sleep(250);
    if (!shouldContinue()) return;

    // 5. Speak targetHanzi in Chinese again, at full rate
    await speakChinese(card.targetHanzi, 1.0);
    if (!shouldContinue()) return;

    // 6. Pause before next sentence
    await sleep(1000);
    if (!shouldContinue()) return;

    // 7. Advance — only update state here; the effect below starts the next
    // item with a fresh call instead of recursing/looping within this one.
    const nextIdx = idx + 1;
    if (nextIdx >= currentQueue.length) {
      // ── Full set completed ──
      const newCount = loopsCompletedRef.current + 1;
      loopsCompletedRef.current = newCount;
      localStorage.setItem(storageKey, String(newCount));
      setLoopsCompleted(newCount);

      // Announce
      await speakEnglish(
        `Loop ${newCount} completed. Starting loop ${newCount + 1}.`
      );
      if (!shouldContinue()) return;

      // Reshuffle, restart
      setQueue(shuffle(allSentences));
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
  }

  // Auto-advance: whenever play state, index, or queue changes, play the
  // current sentence — one fresh call per item, same as the Chapter Audio Loop.
  useEffect(() => {
    if (isPlaying && !isPaused && queue.length > 0) {
      playCurrentSentence(currentIndex, queue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, currentIndex, queue]);

  // ── Controls ───────────────────────────────────────────────────────────────
  // Handlers only update state/refs — the effect above is solely responsible
  // for starting playback, one item at a time.

  function stopAudio() {
    playTokenRef.current++; // invalidate any in-flight sequence
    clearPending();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  const handlePlay = () => {
    if (isPlayingRef.current && !isPausedRef.current) return; // already running
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    stopAudio();
    isPausedRef.current = true;
    setIsPaused(true);
    // isPlaying stays true — UI shows paused state
  };

  const handleStop = () => {
    stopAudio();
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setQueue(shuffle(allSentences));
    setCurrentIndex(0);
  };

  const handleNext = () => {
    stopAudio(); // invalidate any in-flight sequence & cancel current speech

    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      // Wrap without loop credit (manual skip)
      setQueue(shuffle(allSentences));
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
    // If isPlaying && !isPaused, the effect above notices the index (and
    // possibly queue) change and starts the next item fresh automatically.
  };

  const handlePrev = () => {
    stopAudio();

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    // Same as handleNext: playback (if active) resumes via the effect above.
  };

  // ── Pocket Mode helpers ────────────────────────────────────────────────────
  const enterPocketMode = async () => {
    if (!isPlayingRef.current || isPausedRef.current) {
      // Start playing if not already — the effect above starts playback
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
    navigate(`/sentence-set/${setNum}`);
  };

  if (allSentences.length === 0) {
    return (
      <div className="sal-page">
        <div className="sal-header">
          <button className="sal-back-btn" onClick={handleBack}>← Back</button>
          <h1 className="sal-title">Set {setNum} — Audio Loop</h1>
        </div>
        <p className="sal-empty">No sentences found for this set.</p>
      </div>
    );
  }

  const currentCard = queue[currentIndex] ?? null;

  return (
    <div className="sal-page">
      {/* Pocket Mode overlay */}
      {isPocketMode && (
        <div className="sal-pocket-overlay">
          <div className="sal-pocket-info">
            <div className="sal-pocket-label">Pocket Mode</div>
            <div className="sal-pocket-deck">Set {setNum} — Audio Loop</div>
            <div className="sal-pocket-counter">
              Sentence {currentIndex + 1} of {queue.length}
            </div>
            <div className="sal-pocket-loops">
              Loops completed: {loopsCompleted}
            </div>
            {!wakeLockSupported && (
              <div className="sal-pocket-wake-warning">
                Keep-awake not supported on this device. You may need to set
                Auto-Lock to Never.
              </div>
            )}
          </div>
          <button
            className="sal-pocket-unlock-btn"
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
            <span className="sal-pocket-unlock-inner">
              Hold 3s<br />to unlock
            </span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="sal-header">
        <button className="sal-back-btn" onClick={handleBack}>← Back</button>
        <h1 className="sal-title">Set {setNum} — Audio Loop</h1>
      </div>

      {/* Progress */}
      <div className="sal-progress">
        <span>Sentence {currentIndex + 1} of {queue.length}</span>
        <span>Loops completed: {loopsCompleted}</span>
      </div>

      {/* Card */}
      {currentCard && (
        <div className="sal-card">
          <div className="sal-pinyin">{currentCard.targetPinyin}</div>
          <div className="sal-hanzi">{currentCard.targetHanzi}</div>
          <div className="sal-english">{currentCard.english}</div>
        </div>
      )}

      {/* Controls */}
      <div className="sal-controls">
        <button
          className="sal-btn sal-btn--nav"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous"
        >
          ◀ Prev
        </button>

        {!isPlaying || isPaused ? (
          <button className="sal-btn sal-btn--play" onClick={handlePlay} aria-label="Play">
            ▶ Play
          </button>
        ) : (
          <button className="sal-btn sal-btn--pause" onClick={handlePause} aria-label="Pause">
            ⏸ Pause
          </button>
        )}

        <button className="sal-btn sal-btn--stop" onClick={handleStop} aria-label="Stop">
          ⏹ Stop
        </button>

        <button className="sal-btn sal-btn--nav" onClick={handleNext} aria-label="Next">
          Next ▶
        </button>
      </div>

      {/* Pocket Mode button */}
      <div className="sal-pocket-wrap">
        <button className="sal-btn sal-btn--pocket" onClick={enterPocketMode}>
          🌙 Pocket Mode
        </button>
      </div>
    </div>
  );
}
