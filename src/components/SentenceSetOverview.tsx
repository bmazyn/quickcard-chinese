import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { getCardProgress, setPercentComplete } from "../utils/sentenceSetProgress";
import { getTypingProgress, typingPercentComplete } from "../utils/sentenceSetTypingProgress";
import "./SentenceSetOverview.css";

interface Sentence {
  id: string;
  set: number;
  english: string;
}

function ProgressFill({ progress }: { progress: 0 | 1 | 2 | 3 }) {
  const pct = [0, 33, 66, 100][progress];
  return (
    <div className="sso-fill-track">
      <div className="sso-fill-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TypingFill({ done }: { done: boolean }) {
  return (
    <div className="sso-fill-track">
      <div className="sso-fill-bar sso-fill-bar--typing" style={{ width: done ? "100%" : "0%" }} />
    </div>
  );
}

export default function SentenceSetOverview() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();
  const setNum = Number(setId ?? 1);

  const sentences = useMemo(
    () => (sentencesRaw as Sentence[]).filter((s) => s.set === setNum),
    [setNum]
  );

  // Read live progress on every render (store is module-level, always current)
  const progress = sentences.map((s) => getCardProgress(s.id));
  const typingProgress = sentences.map((s) => getTypingProgress(s.id));

  const completed = progress.filter((p) => p === 3).length;
  const pct = setPercentComplete(sentences.map((s) => s.id));
  const typingDone = typingProgress.filter((p) => p === 3).length;
  const typingPct = typingPercentComplete(sentences.map((s) => s.id));

  return (
    <div className="sso-page">
      <div className="sso-shell">
        {/* Header */}
        <div className="sso-header">
          <button
            className="sso-back-btn"
            onClick={() => navigate("/books")}
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="sso-title">Sentence Set {setNum}</h1>
        </div>

        {/* Stats */}
        <div className="sso-stats">
          <div className="sso-stat">
            <span className="sso-stat-value">{sentences.length}</span>
            <span className="sso-stat-label">Total</span>
          </div>
          <div className="sso-stat">
            <span className="sso-stat-value">{completed}</span>
            <span className="sso-stat-label">Complete</span>
          </div>
          <div className="sso-stat">
            <span className="sso-stat-value">{pct}%</span>
            <span className="sso-stat-label">Progress</span>
          </div>
        </div>

        {/* Grid */}
        <div className="sso-grid">
          {sentences.map((s, i) => {
            const p = progress[i];
            return (
              <div
                key={s.id}
                className={`sso-card${p === 3 ? " sso-card--done" : ""}`}
                title={s.english}
              >
                <ProgressFill progress={p} />
              </div>
            );
          })}
        </div>

        {/* Play button */}
        <div className="sso-play-wrap">
          <button
            className="sso-play-btn"
            onClick={() => navigate(`/sentence-set/${setNum}/run`)}
          >
            ▶ Play (10)
          </button>
        </div>

        {/* ── Typing mode section ── */}
        <div className="sso-section-label">Typing Mode</div>

        {/* Typing stats */}
        <div className="sso-stats">
          <div className="sso-stat">
            <span className="sso-stat-value">{sentences.length}</span>
            <span className="sso-stat-label">Total</span>
          </div>
          <div className="sso-stat">
            <span className="sso-stat-value">{typingDone}</span>
            <span className="sso-stat-label">Done</span>
          </div>
          <div className="sso-stat">
            <span className="sso-stat-value">{typingPct}%</span>
            <span className="sso-stat-label">Progress</span>
          </div>
        </div>

        {/* Typing grid — 10 columns × 5 rows */}
        <div className="sso-grid sso-grid--typing">
          {sentences.map((s, i) => {
            const done = typingProgress[i] === 3;
            return (
              <div
                key={s.id}
                className={`sso-card sso-card--typing${done ? " sso-card--typing-done" : ""}`}
                title={s.english}
              >
                <TypingFill done={done} />
              </div>
            );
          })}
        </div>

        {/* Play Typing button */}
        <div className="sso-play-wrap">
          <button
            className="sso-play-btn sso-play-btn--typing"
            onClick={() => navigate(`/sentence-set/${setNum}/type`)}
          >
            ⌨ Play Typing (10)
          </button>
        </div>
      </div>
    </div>
  );
}
