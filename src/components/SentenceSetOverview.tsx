import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { getCardProgress, setPercentComplete } from "../utils/sentenceSetProgress";
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

  const completed = progress.filter((p) => p === 3).length;
  const pct = setPercentComplete(sentences.map((s) => s.id));

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
            ▶ Play
          </button>
        </div>
      </div>
    </div>
  );
}
