export type CardKind = "vocab" | "sentence" | "phrase";

export type ChoiceKey = "A" | "B" | "C" | "D";

export interface QuizCard {
  id: string;
  kind: CardKind;
  promptLine: string;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: ChoiceKey;
  explanations: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  tags: string[];
  difficulty: number;
}

export interface AnswerState {
  selectedChoice: ChoiceKey | null;
  isCorrect: boolean | null;
}
