import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { Question } from "../types";
import questionsData from "../data/questions.json";
import { getDeckIdByName } from "../utils/decks";
import "./StudyList.css";

export default function StudyList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const deckParam = searchParams.get("deck") || "";
  const chapterId = location.state?.chapterId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [displayTitle, setDisplayTitle] = useState("");

  // Load questions for the selected deck
  useEffect(() => {
    if (!deckParam) {
      setQuestions([]);
      setDisplayTitle("Study List");
      return;
    }

    const deckId = getDeckIdByName(deckParam);
    if (!deckId) {
      setQuestions([]);
      setDisplayTitle("Study List");
      return;
    }

    // Ensure questionsData is an array
    const allQuestions = Array.isArray(questionsData) ? questionsData : [questionsData];
    const filteredQuestions = allQuestions.filter((q: any) => 
      q.deckId === deckId
    ) as Question[];

    setQuestions(filteredQuestions);
    setDisplayTitle(deckParam);
  }, [deckParam]);

  const handleBackClick = () => {
    if (chapterId) {
      navigate(`/chapter/${chapterId}`);
    } else {
      navigate("/chapters");
    }
  };

  return (
    <div className="study-list">
      <div className="study-list-header">
        <button className="back-icon" onClick={handleBackClick} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className="study-list-title">{displayTitle}</h1>
      </div>

      <div className="study-list-content">
        {questions.length === 0 ? (
          <div className="no-cards">
            {deckParam ? "No questions found in this deck." : "Select a deck to view questions."}
          </div>
        ) : (
          <div className="cards-list">
            {questions.map((question) => {
              return (
                <div key={question.id} className="card-row">
                  <div className="card-row-top">
                    <span className="card-question">
                      {question.promptLine}
                    </span>
                  </div>
                  <div className="card-row-bottom">
                    <span className="card-answer">
                      <strong>Answer: {question.answer}</strong> - {question.choices[question.answer]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
