import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { gradeSentence, type GradeResult } from "../utils/sentenceGrading";
import { getTypingProgress, markTypingDone } from "../utils/sentenceSetTypingProgress";
import "./SentenceBuilder.css";

interface Sentence {
  id: string;
  set: number;
  category: string;
  section: string;
  english: string;
  targetPinyin: string;
  targetHanzi: string;
  hintWords: string[];
  acceptedVariants: string[];
}

const SESSION_SIZE = 10;

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceSetTypingRun() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();
  const setNum = Number(setId ?? 1);

  const [sentences] = useState<Sentence[]>(() => {
    const pool = (sentencesRaw as Sentence[]).filter((s) => s.set === setNum);
    if (pool.length === 0) return [];

    // Prefer cards not yet done; fall back to all for review
    const notDone = pool.filter((s) => getTypingProgress(s.id) === 0);
    const source = notDone.length > 0 ? notDone : pool;
    return fisherYatesShuffle(source).slice(0, SESSION_SIZE);
  });

  const [index, setIndex] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { grade: GradeResult; userAnswer: string }>(null);

  if (sentences.length === 0) {
    return (
      <div className="sb-page">
        <div className="sb-shell">
          <div className="sb-header">
            <button
              className="sb-back-btn"
              onClick={() => navigate(`/sentence-set/${setNum}`)}
              aria-label="Back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="sb-header-center">
              <span className="sb-title">Sentence Set {setNum} — Typing</span>
            </div>
          </div>
          <p style={{ padding: "24px 16px", textAlign: "center", opacity: 0.6 }}>
            No sentences found for this set.
          </p>
          <button className="sb-submit-btn" onClick={() => navigate(`/sentence-set/${setNum}`)}>
            ← Back to Overview
          </button>
        </div>
      </div>
    );
  }

  const sentence = sentences[index];
  const isLast = index === sentences.length - 1;

  const handleSubmit = () => {
    const grade = gradeSentence(input, sentence.targetPinyin, sentence.acceptedVariants);
    setResult({ grade, userAnswer: input.trim() });
    if (grade.outcome !== "wrong") {
      markTypingDone(sentence.id);
    }
  };

  const goNext = () => {
    if (isLast) {
      navigate(`/sentence-set/${setNum}`);
    } else {
      setIndex(index + 1);
      setShowHints(false);
      setInput("");
      setResult(null);
    }
  };

  const { outcome, typoWord } = result?.grade ?? {};
  const modifierClass =
    outcome === "perfect" ? "sb-result--perfect" :
    outcome === "accepted" ? "sb-result--accepted" :
    "sb-result--wrong";
  const verdictText =
    outcome === "perfect" ? "✅ Perfect!" :
    outcome === "accepted" ? "👍 Accepted" :
    "❌ Try again";

  return (
    <div className="sb-page">
      <div className="sb-shell">
        {/* Header */}
        <div className="sb-header">
          <button
            className="sb-back-btn"
            onClick={() => navigate(`/sentence-set/${setNum}`)}
            aria-label="Back to overview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="sb-header-center">
            <span className="sb-title">Set {setNum} — Typing</span>
            <span className="sb-subtitle">pinyin</span>
          </div>
          <span className="sb-counter">{index + 1} / {sentences.length}</span>
        </div>

        {/* Card */}
        <div className="sb-card">
          <p className="sb-section-label">{sentence.section}</p>
          <p className="sb-english">{sentence.english}</p>

          <label className="sb-hint-label">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(e) => setShowHints(e.target.checked)}
            />
            Show hints
          </label>

          {showHints && sentence.hintWords.length > 0 && (
            <div className="sb-hints">
              {sentence.hintWords.map((w) => (
                <span key={w} className="sb-hint-chip">{w}</span>
              ))}
            </div>
          )}

          {showHints && sentence.hintWords.length === 0 && (
            <p className="sb-no-hints">No hints for this sentence.</p>
          )}

          <input
            className="sb-input"
            type="text"
            placeholder="Type pinyin answer…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!result && input.trim()) handleSubmit();
                else if (result) goNext();
              }
            }}
            disabled={!!result}
            autoCorrect="off"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
          />

          {!result && (
            <button
              className="sb-submit-btn"
              onClick={handleSubmit}
              disabled={!input.trim()}
            >
              Submit
            </button>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`sb-result ${modifierClass}`}>
            <p className="sb-verdict">{verdictText}</p>
            {outcome === "accepted" && typoWord && (
              <p className="sb-typo-note">Minor spelling issue: <strong>{typoWord}</strong></p>
            )}
            <div className="sb-result-row">
              <span className="sb-result-label">Your answer:</span>
              <span className="sb-result-value">{result.userAnswer || <em>empty</em>}</span>
            </div>
            <div className="sb-result-row">
              <span className="sb-result-label">Target pinyin:</span>
              <span className="sb-result-value">{sentence.targetPinyin}</span>
            </div>
            <div className="sb-result-row">
              <span className="sb-result-label">Hanzi:</span>
              <span className="sb-result-value sb-hanzi">{sentence.targetHanzi}</span>
            </div>

            <button className="sb-submit-btn" onClick={goNext}>
              {isLast ? "Finish ✓" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
