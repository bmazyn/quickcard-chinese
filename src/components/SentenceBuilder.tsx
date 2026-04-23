import { useState } from "react";
import { useNavigate } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { gradeSentence, type GradeResult } from "../utils/sentenceGrading";
import "./SentenceBuilder.css";

interface Sentence {
  id: string;
  category: string;
  section: string;
  english: string;
  targetPinyin: string;
  targetHanzi: string;
  hintWords: string[];
  acceptedVariants: string[];
}

const allSentences = sentencesRaw as Sentence[];

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceBuilder() {
  const navigate = useNavigate();
  const [sentences] = useState<Sentence[]>(() => fisherYatesShuffle(allSentences));
  const [index, setIndex] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { grade: GradeResult; userAnswer: string }>(null);

  const sentence = sentences[index];

  const handleSubmit = () => {
    const grade = gradeSentence(input, sentence.targetPinyin, sentence.acceptedVariants);
    setResult({ grade, userAnswer: input.trim() });
  };

  const goTo = (newIndex: number) => {
    setIndex(newIndex);
    setShowHints(false);
    setInput("");
    setResult(null);
  };

  return (
    <div className="sb-page">
      <div className="sb-shell">
        {/* Header */}
        <div className="sb-header">
          <button
            className="sb-back-btn"
            onClick={() => navigate("/books")}
            aria-label="Back to books"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="sb-header-center">
            <span className="sb-title">Sentence Builder</span>
            <span className="sb-subtitle">test</span>
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
              onChange={e => setShowHints(e.target.checked)}
            />
            Show hints
          </label>

          {showHints && sentence.hintWords.length > 0 && (
            <div className="sb-hints">
              {sentence.hintWords.map(w => (
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && input.trim() && !result) handleSubmit(); }}
            disabled={!!result}
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
        {result && (() => {
          const { outcome, typoWord } = result.grade;
          const modifierClass =
            outcome === "perfect" ? "sb-result--perfect" :
            outcome === "accepted" ? "sb-result--accepted" :
            "sb-result--wrong";
          const verdictText =
            outcome === "perfect" ? "✅ Perfect!" :
            outcome === "accepted" ? "👍 Accepted" :
            "❌ Try again";
          return (
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
            </div>
          );
        })()}

        {/* Navigation */}
        <div className="sb-nav">
          <button
            className="sb-nav-btn"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            ← Previous
          </button>
          <button
            className="sb-nav-btn"
            onClick={() => goTo(index + 1)}
            disabled={index === sentences.length - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
