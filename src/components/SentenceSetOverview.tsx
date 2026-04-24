import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { getCardProgress } from "../utils/sentenceSetProgress";
import "./SentenceSetOverview.css";

interface Sentence {
  id: string;
  set: number;
  english: string;
}

const SET_NUMBER = 1;

function ProgressFill({ progress }: { progress: 0 | 1 | 2 | 3 }) {
  const pct = [0, 33, 66, 100][progress];
  return (
    <div className="sso-fill-track">
      <div className="sso-fill-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SentenceSetOverview() {
  const navigate = useNavigate();

  const sentences = useMemo(
    () => (sentencesRaw as Sentence[]).filter((s) => s.set === SET_NUMBER),
    []
  );

  // Read live progress on every render (store is module-level, always current)
  const progress = sentences.map((s) => getCardProgress(s.id));

  const completed = progress.filter((p) => p === 3).length;

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
          <h1 className="sso-title">Sentence Set {SET_NUMBER}</h1>
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
            onClick={() => navigate(`/sentence-set/${SET_NUMBER}/run`)}
          >
            ▶ Play
          </button>
        </div>
      </div>
    </div>
  );
}
