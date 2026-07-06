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

  // ── Refs for async loop (avoid stale closures) ─────────────────────────────
  // runIdRef: incremented each time a new loop starts — old loops bail on mismatch
  const runIdRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentIndexRef = useRef(0);
  // queueRef is the source of truth for runLoop; state is only for rendering
  const queueRef = useRef<SentenceCard[]>(queue);
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
      speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "zh-CN";
      utt.rate = rate;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      speechSynthesis.speak(utt);
    });
  }

  function speakEnglish(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      const voices = speechSynthesis.getVoices();
      const engVoice = voices.find((v) => v.lang.startsWith("en"));
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-US";
      if (engVoice) utt.voice = engVoice;
      utt.rate = 0.9;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      speechSynthesis.speak(utt);
    });
  }

  function playBeep(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
        osc.onended = () => { ctx.close(); resolve(); };
      } catch {
        resolve();
      }
    });
  }

  // ── Main audio loop ────────────────────────────────────────────────────────
  // Each invocation grabs a unique myId. If runIdRef changes (new call started),
  // the old loop exits at the next check — prevents double-running.

  async function runLoop() {
    const myId = ++runIdRef.current;

    while (myId === runIdRef.current && shouldPlayRef.current) {
      const idx = currentIndexRef.current;
      const q = queueRef.current;
      if (q.length === 0 || idx >= q.length) break;

      const card = q[idx];

      // 1. Speak targetHanzi in Chinese
      await speakChinese(card.targetHanzi);
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      // 2. 0.25s pause
      await sleep(250);
      await speakEnglish(card.english);
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      // 4. 0.25s pause
      await sleep(250);
      await speakChinese(card.targetHanzi, 1.0);
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      // 6. 0.5s pause, soft beep, 0.75s pause before next sentence
      await sleep(500);
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      await playBeep();
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      await sleep(750);
      if (myId !== runIdRef.current || !shouldPlayRef.current) break;

      // 5. Advance
      const nextIdx = idx + 1;
      if (nextIdx >= q.length) {
        // ── Full set completed ──
        const newCount = loopsCompletedRef.current + 1;
        loopsCompletedRef.current = newCount;
        localStorage.setItem(storageKey, String(newCount));
        setLoopsCompleted(newCount);

        // Announce
        await speakEnglish(
          `Loop ${newCount} completed. Starting loop ${newCount + 1}.`
        );
        if (myId !== runIdRef.current || !shouldPlayRef.current) break;

        // Reshuffle, restart
        const newQueue = shuffle(allSentences);
        queueRef.current = newQueue;
        setQueue(newQueue);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
      } else {
        currentIndexRef.current = nextIdx;
        setCurrentIndex(nextIdx);
      }
    }
  }

  // ── Controls ───────────────────────────────────────────────────────────────

  function stopAudio() {
    shouldPlayRef.current = false;
    clearPending();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  const handlePlay = () => {
    if (shouldPlayRef.current) return; // already running
    shouldPlayRef.current = true;
    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    runLoop();
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
    const newQueue = shuffle(allSentences);
    queueRef.current = newQueue;
    currentIndexRef.current = 0;
    setQueue(newQueue);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    const wasPlaying = isPlayingRef.current && !isPausedRef.current;
    // Invalidate any running loop
    runIdRef.current++;
    stopAudio();

    const q = queueRef.current;
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= q.length) {
      // Wrap without loop credit (manual skip)
      const newQueue = shuffle(allSentences);
      queueRef.current = newQueue;
      setQueue(newQueue);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    } else {
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
    }

    if (wasPlaying) {
      // Brief delay so cancelled TTS resolves before new loop starts
      setTimeout(() => {
        shouldPlayRef.current = true;
        runLoop();
      }, 80);
    }
  };

  const handlePrev = () => {
    const wasPlaying = isPlayingRef.current && !isPausedRef.current;
    runIdRef.current++;
    stopAudio();

    if (currentIndexRef.current > 0) {
      currentIndexRef.current -= 1;
      setCurrentIndex(currentIndexRef.current);
    }

    if (wasPlaying) {
      setTimeout(() => {
        shouldPlayRef.current = true;
        runLoop();
      }, 80);
    }
  };

  // ── Pocket Mode helpers ────────────────────────────────────────────────────
  const enterPocketMode = async () => {
    if (!isPlayingRef.current || isPausedRef.current) {
      // Start playing if not already
      shouldPlayRef.current = true;
      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      runLoop();
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
      shouldPlayRef.current = false;
      clearPending();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
