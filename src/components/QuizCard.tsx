import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import ThemeToggle from "./ThemeToggle";
import "./QuizCard.css";

interface QuizCardProps {
  card: QuizCardType;
  answerState: AnswerState;
  onAnswer: (choice: ChoiceKey) => void;
  onNext: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function triggerHaptic(isCorrect: boolean) {
  // Check if device supports vibration API
  if ('vibrate' in navigator) {
    if (isCorrect) {
      // Light tap for correct answer
      navigator.vibrate(10);
    } else {
      // Slightly stronger pattern for incorrect answer
      navigator.vibrate([15, 10, 15]);
    }
  }
}

export default function QuizCard({ card, answerState, onAnswer, onNext, theme, onToggleTheme }: QuizCardProps) {
  const isAnswered = answerState.selectedChoice !== null;
  const choices: ChoiceKey[] = ["A", "B", "C", "D"];

  const getChoiceClassName = (choice: ChoiceKey): string => {
    if (!isAnswered) return "choice-button";
    
    const isSelected = choice === answerState.selectedChoice;
    const isCorrect = choice === card.correct;
    
    if (isCorrect) return "choice-button correct";
    if (isSelected && !isCorrect) return "choice-button incorrect";
    return "choice-button dimmed";
  };

  const handleAnswerClick = (choice: ChoiceKey) => {
    if (!isAnswered) {
      const isCorrect = choice === card.correct;
      triggerHaptic(isCorrect);
      onAnswer(choice);
    }
  };

  const handlePronunciation = () => {
    // Use browser Text-to-Speech for hanzi pronunciation
    if ('speechSynthesis' in window) {
      // Stop any currently playing audio
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9; // Slightly slower for learning
      window.speechSynthesis.speak(utterance);
    }
    // Fail silently if not supported
  };

  // Split promptLine from dataset - format: "pinyin — hanzi"
  const [pinyin, hanzi] = card.promptLine.split(' — ');

  return (
    <div className="quiz-card">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />

      <div className="prompt-section">
        <div className="pinyin">{pinyin}</div>
        <div className="hanzi" onClick={handlePronunciation}>{hanzi}</div>
      </div>

      <div className="choices">
        {choices.map((choice) => (
          <button
            key={choice}
            className={getChoiceClassName(choice)}
            onClick={() => handleAnswerClick(choice)}
            disabled={isAnswered}
          >
            {/* Answer text comes directly from card.choices - no modifications */}
            <span className="choice-text">{card.choices[choice]}</span>
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="feedback">
          <div className={`feedback-status ${answerState.isCorrect ? "correct" : "incorrect"}`}>
            {answerState.isCorrect 
              ? "✓ Correct" 
              : `✕ Wrong — Correct: ${card.correct}`}
          </div>
          <button className="next-button" onClick={onNext}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
