import type { QuizCard as QuizCardType, ChoiceKey, AnswerState } from "../types";
import "./QuizCard.css";

interface QuizCardProps {
  card: QuizCardType;
  answerState: AnswerState;
  onAnswer: (choice: ChoiceKey) => void;
  onNext: () => void;
}

export default function QuizCard({ card, answerState, onAnswer, onNext }: QuizCardProps) {
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

  return (
    <div className="quiz-card">
      <div className="card-header">
        <span className="card-kind">{card.kind}</span>
      </div>

      <div className="prompt-line">{card.promptLine}</div>
      
      <div className="question">{card.question}</div>

      <div className="choices">
        {choices.map((choice) => (
          <button
            key={choice}
            className={getChoiceClassName(choice)}
            onClick={() => !isAnswered && onAnswer(choice)}
            disabled={isAnswered}
          >
            <span className="choice-label">{choice}</span>
            <span className="choice-text">{card.choices[choice]}</span>
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="feedback">
          <div className={`feedback-message ${answerState.isCorrect ? "correct" : "incorrect"}`}>
            {answerState.isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </div>
          <div className="explanation">
            {card.explanations[answerState.selectedChoice!]}
          </div>
          <button className="next-button" onClick={onNext}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
