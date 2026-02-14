import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { Question } from "../types";
import questionsData from "../data/questions.json";
import { getDeckIdByName } from "../utils/decks";
import "./AudioLoop.css";

export default function AudioLoop() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const decksParam = searchParams.get("decks") || "";
  const chapterId = location.state?.chapterId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayTitle, setDisplayTitle] = useState("");

  // Load questions for the selected decks
  useEffect(() => {
    let filteredQuestions: Question[] = [];
    let title = "Audio Loop";
    
    if (decksParam) {
      // Load selected decks (decksParam contains deck names)
      const selectedDeckNames = decksParam.split(',');
      const selectedDeckIds = selectedDeckNames
        .map(name => getDeckIdByName(name))
        .filter((id): id is string => id !== undefined);
      
      filteredQuestions = questionsData.filter((q) => 
        selectedDeckIds.includes(q.deckId)
      ) as Question[];
      title = selectedDeckNames.length === 1 ? selectedDeckNames[0] : `${selectedDeckNames.length} Decks`;
    }
    
    setQuestions(filteredQuestions);
    setDisplayTitle(title);
  }, [decksParam]);

  const handleBackClick = () => {
    if (chapterId) {
      navigate(`/chapter/${chapterId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="audio-loop">
      <div className="audio-loop-content">
        <div className="audio-loop-header">
          <button className="home-icon" onClick={handleBackClick} aria-label="Go back">
            ← Back
          </button>
          <h2 className="audio-loop-title">{displayTitle}</h2>
        </div>
        <div className="no-cards">
          <p>Audio Loop is not available for technical quiz questions.</p>
          <p>Use Quiz mode to practice questions.</p>
        </div>
      </div>
    </div>
  );
}
