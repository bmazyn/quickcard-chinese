import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import storiesData from "../data/stories.json";
import type { Story } from "./Stories";
import "./StoryPlayer.css";

const stories = storiesData as Story[];

export default function StoryPlayer() {
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId: string }>();
  const story = stories.find((s) => s.id === storyId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [includeEnglish, setIncludeEnglish] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [loopStory, setLoopStory] = useState(true);

  // Pocket Mode
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [holdProgress, setHoldProgress] = useState(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);

  const timeoutRef = useRef<number | null>(null);
  // Track whether playback is active inside the async loop
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const includeEnglishRef = useRef(includeEnglish);
  const loopStoryRef = useRef(loopStory);

  // Keep refs in sync with state
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { includeEnglishRef.current = includeEnglish; }, [includeEnglish]);
  useEffect(() => { loopStoryRef.current = loopStory; }, [loopStory]);

  if (!story) {
    return (
      <div className="story-player">
        <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: 60 }}>
          Story not found.
        </p>
        <button className="sp-back-btn" onClick={() => navigate("/stories")}>← Back</button>
      </div>
    );
  }

  const lines = story.lines;

  // ── Pocket Mode helpers ──────────────────────────────────────
  const enterPocketMode = async () => {
    if (!isPlaying || isPaused) {
      setIsPlaying(true);
      setIsPaused(false);
    }
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
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

  // ── TTS helpers ──────────────────────────────────────────────
  const speakChinese = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });

  const speakEnglish = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (!("speechSynthesis" in window)) { resolve(); return; }
      speechSynthesis.cancel();
      const voices = speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith("en"));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      if (enVoice) u.voice = enVoice;
      u.rate = 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });

  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, ms);
    });

  // ── Playback loop ────────────────────────────────────────────
  const playFrom = async (startIndex: number) => {
    let idx = startIndex;
    while (true) {
      if (!isPlayingRef.current || isPausedRef.current) return;
      if (idx >= lines.length) {
        if (loopStoryRef.current) {
          idx = 0;
          setCurrentIndex(0);
          await delay(800);
          continue;
        } else {
          setIsPlaying(false);
          setIsPaused(false);
          if (isPocketMode) exitPocketMode();
          return;
        }
      }

      setCurrentIndex(idx);

      // Chinese
      await speakChinese(lines[idx].hanzi);
      if (!isPlayingRef.current || isPausedRef.current) return;

      // English (if enabled)
      if (includeEnglishRef.current) {
        await delay(500);
        if (!isPlayingRef.current || isPausedRef.current) return;
        await speakEnglish(lines[idx].english);
        if (!isPlayingRef.current || isPausedRef.current) return;
      }

      await delay(900);
      if (!isPlayingRef.current || isPausedRef.current) return;

      idx++;
    }
  };

  // ── Controls ─────────────────────────────────────────────────
  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
    speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isPocketMode) exitPocketMode();
  };

  const handlePrev = () => {
    speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentIndex((i) => Math.max(0, i - 1));
    if (isPlaying && !isPaused) {
      // Will restart via useEffect
    }
  };

  const handleNext = () => {
    speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentIndex((i) => Math.min(lines.length - 1, i + 1));
  };

  // ── Start/resume playback when state changes ─────────────────
  useEffect(() => {
    if (isPlaying && !isPaused && lines.length > 0) {
      playFrom(currentIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, currentIndex]);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const line = lines[currentIndex];

  return (
    <div className="story-player">
      {/* ── Pocket Mode overlay ── */}
      {isPocketMode && (
        <div className="pocket-overlay">
          <div className="pocket-info">
            <div className="pocket-label">Pocket Mode</div>
            <div className="pocket-deck">{story.title}</div>
            <div className="pocket-counter">{currentIndex + 1} / {lines.length}</div>
            {!wakeLockSupported && (
              <div className="pocket-wake-warning">
                Keep-awake not supported. You may need to set Auto-Lock to Never.
              </div>
            )}
          </div>
          <button
            className="pocket-unlock-btn"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onTouchCancel={handleHoldEnd}
            style={{
              background: `conic-gradient(rgba(255,255,255,0.9) ${holdProgress * 3.6}deg, rgba(255,255,255,0.15) 0deg)`,
            }}
          >
            <span className="pocket-unlock-inner">
              Hold 3s<br />to unlock
            </span>
          </button>
        </div>
      )}

      {/* ── Normal UI ── */}
      <div className="sp-content">
        <div className="sp-header">
          <button
            className="sp-back-btn"
            onClick={() => { handleStop(); navigate("/stories"); }}
            aria-label="Back to stories"
          >
            ← Back
          </button>
          <h2 className="sp-title">{story.title}</h2>
        </div>

        <div className="sp-card">
          <div className="sp-counter">{currentIndex + 1} / {lines.length}</div>
          <div className="sp-hanzi">{line.hanzi}</div>
          {showPinyin && <div className="sp-pinyin">{line.pinyin}</div>}
          {includeEnglish && <div className="sp-english">{line.english}</div>}
        </div>

        {/* Toggles */}
        <div className="sp-toggles">
          <label className="sp-toggle">
            <span>Include English</span>
            <button
              className={`sp-toggle-btn ${includeEnglish ? "on" : "off"}`}
              onClick={() => setIncludeEnglish((v) => !v)}
            >
              {includeEnglish ? "On" : "Off"}
            </button>
          </label>
          <label className="sp-toggle">
            <span>Show Pinyin</span>
            <button
              className={`sp-toggle-btn ${showPinyin ? "on" : "off"}`}
              onClick={() => setShowPinyin((v) => !v)}
            >
              {showPinyin ? "On" : "Off"}
            </button>
          </label>
          <label className="sp-toggle">
            <span>Loop Story</span>
            <button
              className={`sp-toggle-btn ${loopStory ? "on" : "off"}`}
              onClick={() => setLoopStory((v) => !v)}
            >
              {loopStory ? "On" : "Off"}
            </button>
          </label>
        </div>

        {/* Controls */}
        <div className="sp-controls">
          <button className="sp-ctrl-btn" onClick={handlePrev} aria-label="Previous line">⏮</button>
          {!isPlaying || isPaused ? (
            <button className="sp-ctrl-btn sp-play" onClick={handlePlay} aria-label="Play">▶️</button>
          ) : (
            <button className="sp-ctrl-btn sp-pause" onClick={handlePause} aria-label="Pause">⏸️</button>
          )}
          <button className="sp-ctrl-btn sp-stop" onClick={handleStop} aria-label="Stop">⏹️</button>
          <button className="sp-ctrl-btn" onClick={handleNext} aria-label="Next line">⏭</button>
          <button className="sp-ctrl-btn sp-pocket" onClick={enterPocketMode} aria-label="Pocket Mode">🌙</button>
        </div>
      </div>
    </div>
  );
}
