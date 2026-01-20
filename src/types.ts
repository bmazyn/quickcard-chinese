export type CardKind = "vocab" | "sentence" | "phrase";

export type HSKLevel = "HSK1" | "HSK1b" | "HSK1-PHRASE" | "HSK1c" | "HSK2";

export type ChoiceKey = "A" | "B" | "C" | "D";

export interface QuizCard {
  id: string;
  kind: CardKind;
  level: HSKLevel;
  deck: string;
  section: string;
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
