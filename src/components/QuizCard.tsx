import { useMemo } from "react";
import type { Question, ChoiceKey, AnswerState } from "../types";
import "./QuizCard.css";

interface QuizCardProps {
  card: Question;
  answerState: AnswerState;
  onAnswer: (choice: ChoiceKey) => void;
  onNext: () => void;
  isDisabled?: boolean;
  nextButtonText?: string;
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

export default function QuizCard({ card, answerState, onAnswer, onNext, isDisabled = false, nextButtonText = "Next →" }: QuizCardProps) {
  const isAnswered = answerState.selectedChoice !== null;
  
  // Shuffle choices once per card to prevent position memorization
  const shuffledChoices = useMemo(() => {
    const choices: ChoiceKey[] = ["A", "B", "C", "D"];
    const shuffled = [...choices];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [card.id]); // Reshuffle only when card changes

  const getChoiceClassName = (choice: ChoiceKey): string => {
    if (!isAnswered) return "choice-button";
    
    const isSelected = choice === answerState.selectedChoice;
    const isCorrect = choice === card.answer;
    
    if (isCorrect) return "choice-button correct";
    if (isSelected && !isCorrect) return "choice-button incorrect";
    return "choice-button dimmed";
  };

  const handleAnswerClick = (choice: ChoiceKey, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAnswered) {
      const isCorrect = choice === card.answer;
      triggerHaptic(isCorrect);
      onAnswer(choice);
      // Blur the button to remove focus outline after click
      event.currentTarget.blur();
    }
  };

  return (
    <div className="quiz-card">
      <div className="prompt-section">
        <div className="question-text">{card.promptLine}</div>
      </div>

      <div className="choices">
        {shuffledChoices.map((choice) => (
          <button
            key={choice}
            className={getChoiceClassName(choice)}
            onClick={(e) => handleAnswerClick(choice, e)}
            disabled={isAnswered || isDisabled}
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
              : "✕ Wrong"}
          </div>
          <div className="explanation">
            <strong>Correct Answer: {card.answer}</strong>
            <p>{card.whyCorrect}</p>
            {!answerState.isCorrect && answerState.selectedChoice && card.whyWrong[answerState.selectedChoice] && (
              <div className="why-wrong">
                <strong>Why {answerState.selectedChoice} is wrong:</strong>
                <p>{card.whyWrong[answerState.selectedChoice]}</p>
              </div>
            )}
          </div>
          <button className="next-button" onClick={onNext} disabled={isDisabled}>
            {nextButtonText}
          </button>
        </div>
      )}
    </div>
  );
}
          