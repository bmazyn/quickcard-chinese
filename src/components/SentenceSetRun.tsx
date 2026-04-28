import { useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import sentencesRaw from "../data/sentences.json";
import { normalizePinyin } from "../utils/sentenceGrading";
import { advanceCardProgress, getCardProgress } from "../utils/sentenceSetProgress";
// Reuse the existing word-bank styles — no separate CSS needed
import "./SentenceWordBank.css";
import "./SentenceSetRun.css";

interface Sentence {
  id: string;
  set: number;
  english: string;
  targetPinyin: string;
  targetHanzi: string;
  wordBank: string[];
  hanziWordBank?: string[];
  extraWord?: string;
  extraWordHanzi?: string;
  extraWord2?: string;
  extraWord2Hanzi?: string;
  acceptedVariants: string[];
  section: string;
}

interface DeckCard {
  sentence: Sentence;
  level: 1 | 2 | 3;
}

const RUN_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakHanzi(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "zh-CN";
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

function buildBank(card: DeckCard): string[] {
  const chips = [...card.sentence.wordBank];
  if (card.level >= 2 && card.sentence.extraWord) chips.push(card.sentence.extraWord);
  if (card.level >= 3 && card.sentence.extraWord2) chips.push(card.sentence.extraWord2);
  return shuffle(chips);
}

type Outcome = "correct" | "wrong" | null;

/** Build a pinyin -> hanzi map from parallel arrays (safe if lengths differ or field missing). */
function buildHanziMap(sentence: Sentence): Map<string, string> {
  const map = new Map<string, string>();
  const hw = sentence.hanziWordBank;
  if (!hw) return map;
  sentence.wordBank.forEach((py, i) => {
    if (i < hw.length) map.set(py, hw[i]);
  });
  if (sentence.extraWord && sentence.extraWordHanzi)
    map.set(sentence.extraWord, sentence.extraWordHanzi);
  if (sentence.extraWord2 && sentence.extraWord2Hanzi)
    map.set(sentence.extraWord2, sentence.extraWord2Hanzi);
  return map;
}

/** A single word-bank chip. Shows pinyin only, or pinyin + hanzi if available. */
function Chip({
  pinyin, hanzi, onClick, disabled, className,
}: {
  pinyin: string;
  hanzi?: string;
  onClick: () => void;
  disabled: boolean;
  className: string;
}) {
  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      <span className="ssr-chip-pinyin">{pinyin}</span>
      {hanzi && <span className="ssr-chip-hanzi">{hanzi}</span>}
    </button>
  );
}

// ─── Main run component ────────────────────────────────────────────────────
export default function SentenceSetRun() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();
  const setNum = Number(setId ?? 1);

  // Build deck: L1 for progress=0, L2 for progress=1, L3 for progress=2, skip progress=3
  const deck = useMemo<DeckCard[]>(() => {
    const pool = (sentencesRaw as Sentence[]).filter(
      s => s.set === setNum && Array.isArray(s.wordBank) && s.wordBank.length > 0
    );
    const eligible: DeckCard[] = [];
    for (const s of pool) {
      const p = getCardProgress(s.id);
      if (p === 0) eligible.push({ sentence: s, level: 1 });
      else if (p === 1) eligible.push({ sentence: s, level: 2 });
      else if (p === 2) eligible.push({ sentence: s, level: 3 });
      // p === 3: fully complete, skip
    }
    return shuffle(eligible).slice(0, RUN_SIZE);
  }, [setNum]);

  const [index, setIndex] = useState(0);

  const card = deck[index];
  const sentence = card.sentence;

  const [available, setAvailable] = useState<string[]>(() => buildBank(card));
  const [placed, setPlaced]   = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const pageRef   = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── card transition helpers ──────────────────────────────────────────────
  function loadCard(newIndex: number) {
    const next = deck[newIndex];
    setIndex(newIndex);
    setAvailable(buildBank(next));
    setPlaced([]);
    setOutcome(null);
    pageRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleNext() {
    if (index + 1 >= deck.length) {
      navigate(`/sentence-set/${setNum}`);
    } else {
      loadCard(index + 1);
    }
  }

  // ── chip interaction ─────────────────────────────────────────────────────
  function tapAvailable(chip: string, i: number) {
    if (outcome !== null) return;
    setAvailable(prev => prev.filter((_, idx) => idx !== i));
    setPlaced(prev => [...prev, chip]);
  }

  function tapPlaced(chip: string, i: number) {
    if (outcome !== null) return;
    setPlaced(prev => prev.filter((_, idx) => idx !== i));
    setAvailable(prev => [...prev, chip]);
  }

  // ── submit ───────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (placed.length === 0) return;
    const built = normalizePinyin(placed.join(" "));
    const targets = [sentence.targetPinyin, ...sentence.acceptedVariants].map(normalizePinyin);
    const isCorrect = targets.includes(built);
    setOutcome(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      advanceCardProgress(sentence.id, card.level);
      speakHanzi(sentence.targetHanzi);
    }
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }

  const builtAnswer = placed.join(" ");
  const hanziMap = buildHanziMap(sentence);

  return (
    <div ref={pageRef} className="swb-page">
      <div className="swb-shell">

        {/* Header */}
        <div className="swb-header">
          <button
            className="swb-back-btn"
            onClick={() => navigate(`/sentence-set/${setNum}`)}
            aria-label="Back to set overview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="swb-header-center">
            <span className="swb-title">Set {setNum} · Level {card.level}</span>
            <span className="swb-subtitle">Word Bank</span>
          </div>
          <span className="swb-counter">{index + 1} / {deck.length}</span>
        </div>

        {/* Card */}
        <div className="swb-card">
          <p className="swb-section-label">{sentence.section}</p>
          <p className="swb-english">{sentence.english}</p>

          <div className="swb-tray-label">Your answer:</div>
          <div className={`swb-tray${placed.length === 0 ? " swb-tray--empty" : ""}`}>
            {placed.length === 0
              ? <span className="swb-tray-placeholder">Tap words below to build your answer</span>
              : placed.map((chip, i) => (
                  <Chip
                    key={`p-${i}`}
                    pinyin={chip}
                    hanzi={hanziMap.get(chip)}
                    className="swb-chip swb-chip--placed"
                    onClick={() => tapPlaced(chip, i)}
                    disabled={outcome !== null}
                  />
                ))
            }
          </div>

          <div className="swb-bank">
            {available.map((chip, i) => (
              <Chip
                key={`a-${i}`}
                pinyin={chip}
                hanzi={hanziMap.get(chip)}
                className="swb-chip swb-chip--available"
                onClick={() => tapAvailable(chip, i)}
                disabled={outcome !== null}
              />
            ))}
          </div>
        </div>

        {/* Result */}
        {outcome !== null && (
          <div
            ref={resultRef}
            className={`swb-result${outcome === "correct" ? " swb-result--correct" : " swb-result--wrong"}`}
          >
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
              >
                🔊
              </button>
            </div>
          </div>
        )}

        <div className="swb-nav-spacer" />

        {/* Bottom action bar */}
        <div className="swb-bottom-nav">
          {outcome === null ? (
            <button
              className="swb-nav-btn swb-nav-btn--primary"
              onClick={handleSubmit}
              disabled={placed.length === 0}
            >
              Submit
            </button>
          ) : (
            <button
              className="swb-nav-btn swb-nav-btn--primary"
              onClick={handleNext}
            >
              {index + 1 >= deck.length ? "Finish" : "Next →"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
