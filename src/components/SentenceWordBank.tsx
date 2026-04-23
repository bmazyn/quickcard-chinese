import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { normalizePinyin } from "../utils/sentenceGrading";
import "./SentenceWordBank.css";

/** Speak text using the Web Speech API. Falls back silently if unavailable. */
function speakHanzi(text: string, lang = "zh-CN") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

interface Sentence {
  id: string;
  category: string;
  section: string;
  english: string;
  targetPinyin: string;
  targetHanzi: string;
  wordBank: string[];
  acceptedVariants: string[];
}

const allSentences = (sentencesRaw as Sentence[]).filter(
  s => Array.isArray(s.wordBank) && s.wordBank.length > 0
);

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffledBank(sentence: Sentence): string[] {
  return fisherYatesShuffle(sentence.wordBank);
}

type Outcome = "correct" | "wrong" | null;

export default function SentenceWordBank() {
  const navigate = useNavigate();
  const [sentences] = useState<Sentence[]>(() => fisherYatesShuffle(allSentences));
  const [index, setIndex] = useState(0);

  const sentence = sentences[index];

  // available = chips still in the bank; placed = chips the user tapped in order
  const [available, setAvailable] = useState<string[]>(() => shuffledBank(sentence));
  const [placed, setPlaced] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const goTo = (newIndex: number) => {
    const next = sentences[newIndex];
    setIndex(newIndex);
    setAvailable(shuffledBank(next));
    setPlaced([]);
    setOutcome(null);
    pageRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const tapAvailable = (chip: string, idx: number) => {
    if (outcome !== null) return;
    setAvailable(prev => prev.filter((_, i) => i !== idx));
    setPlaced(prev => [...prev, chip]);
  };

  const tapPlaced = (chip: string, idx: number) => {
    if (outcome !== null) return;
    setPlaced(prev => prev.filter((_, i) => i !== idx));
    setAvailable(prev => [...prev, chip]);
  };

  const handleSubmit = () => {
    if (placed.length === 0) return;
    const built = placed.join(" ");
    const builtNorm = normalizePinyin(built);
    const targets = [sentence.targetPinyin, ...sentence.acceptedVariants].map(normalizePinyin);
    const isCorrect = targets.includes(builtNorm);
    setOutcome(isCorrect ? "correct" : "wrong");
    if (isCorrect) speakHanzi(sentence.targetHanzi);
    // Scroll result into view after state update
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  };

  const builtAnswer = placed.join(" ");

  return (
    <div ref={pageRef} className="swb-page">
      <div className="swb-shell">

        {/* Header */}
        <div className="swb-header">
          <button className="swb-back-btn" onClick={() => navigate("/books")} aria-label="Back to books">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="swb-header-center">
            <span className="swb-title">Sentence Builder</span>
            <span className="swb-subtitle">Word Bank</span>
          </div>
          <span className="swb-counter">{index + 1} / {sentences.length}</span>
        </div>

        {/* Card */}
        <div className="swb-card">
          <p className="swb-section-label">{sentence.section}</p>
          <p className="swb-english">{sentence.english}</p>

          {/* Answer tray */}
          <div className="swb-tray-label">Your answer:</div>
          <div className={`swb-tray ${placed.length === 0 ? "swb-tray--empty" : ""}`}>
            {placed.length === 0
              ? <span className="swb-tray-placeholder">Tap words below to build your answer</span>
              : placed.map((chip, i) => (
                  <button
                    key={`placed-${i}`}
                    className="swb-chip swb-chip--placed"
                    onClick={() => tapPlaced(chip, i)}
                    disabled={outcome !== null}
                  >
                    {chip}
                  </button>
                ))
            }
          </div>

          {/* Word bank */}
          <div className="swb-bank">
            {available.map((chip, i) => (
              <button
                key={`avail-${i}`}
                className="swb-chip swb-chip--available"
                onClick={() => tapAvailable(chip, i)}
                disabled={outcome !== null}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {outcome !== null && (
          <div ref={resultRef} className={`swb-result ${outcome === "correct" ? "swb-result--correct" : "swb-result--wrong"}`}>
            <p className="swb-verdict">{outcome === "correct" ? "✅ Correct!" : "❌ Incorrect"}</p>
            <div className="swb-result-row">
              <span className="swb-result-label">Answer:</span>
              <span className="swb-result-value">{builtAnswer}</span>
            </div>
            <div className="swb-result-row">
              <span className="swb-result-label">Target:</span>
              <span className="swb-result-value">{sentence.targetPinyin}</span>
            </div>
            <div className="swb-result-row">
              <span className="swb-result-label">Hanzi:</span>
              <span className="swb-result-value swb-hanzi">{sentence.targetHanzi}</span>
              <button
                className="swb-speak-btn"
                onClick={() => speakHanzi(sentence.targetHanzi)}
                aria-label="Replay audio"
                title="Replay"
              >
                🔊
              </button>
            </div>
          </div>
        )}

        {/* Spacer above the action bar */}
        <div className="swb-nav-spacer" />

        {/* Single bottom action bar — constrained by swb-shell max-width */}
        <div className="swb-bottom-nav">
          {outcome === null && (
            <button className="swb-nav-btn swb-nav-btn--primary" onClick={handleSubmit} disabled={placed.length === 0}>
              Submit
            </button>
          )}
          {outcome !== null && (
            <button
              className="swb-nav-btn swb-nav-btn--primary"
              onClick={() => goTo(index + 1)}
              disabled={index === sentences.length - 1}
            >
              Next →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
