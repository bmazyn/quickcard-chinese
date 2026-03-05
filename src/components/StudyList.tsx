import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckIdByName } from "../utils/decks";
import "./StudyList.css";

export default function StudyList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const deckParam = searchParams.get("deck") || "";
  const chapterId = location.state?.chapterId;
  const bookId = location.state?.bookId;

  const [cards, setCards] = useState<QuizCard[]>([]);
  const [displayTitle, setDisplayTitle] = useState("");

  // Load cards for the selected deck
  useEffect(() => {
    if (!deckParam) {
      setCards([]);
      setDisplayTitle("Study List");
      return;
    }

    const deckId = getDeckIdByName(deckParam);
    if (!deckId) {
      setCards([]);
      setDisplayTitle("Study List");
      return;
    }

    const deckCards = quizCardsData.filter((card) => 
      card.deckId === deckId
    ) as QuizCard[];

    // Filter cards that have both hanzi and pinyin
    const validCards = deckCards.filter((card) => {
      const parts = card.promptLine.split(" — ");
      const pinyin = parts[0]?.trim() || "";
      const hanzi = parts[1]?.trim() || "";
      return pinyin && hanzi && /[\u4e00-\u9fff]/.test(hanzi);
    });

    setCards(validCards);
    setDisplayTitle(deckParam);
  }, [deckParam]);

  // Parse pinyin and hanzi from promptLine (format: "pinyin — hanzi")
  const parseCard = (card: QuizCard) => {
    const parts = card.promptLine.split(" — ");
    return {
      pinyin: parts[0]?.trim() || "",
      hanzi: parts[1]?.trim() || "",
      meaning: card.choices[card.correct],
    };
  };

  // Play audio for a card
  const playAudio = (card: QuizCard) => {
    const { hanzi } = parseCard(card);
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const handleBackClick = () => {
    if (chapterId) {
      navigate(`/chapters/${chapterId}`);
    } else if (bookId) {
      navigate(`/books/${bookId}`);
    } else {
      navigate("/books");
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
        {cards.length === 0 ? (
          <div className="no-cards">
            {deckParam ? "No cards found in this deck." : "Select a deck to view cards."}
          </div>
        ) : (
          <div className="cards-list">
            {cards.map((card) => {
              const { pinyin, hanzi, meaning } = parseCard(card);
              return (
                <div key={card.id} className="card-row">
                  <div className="card-row-top">
                    <span 
                      className="card-pinyin" 
                      onClick={() => playAudio(card)}
                    >
                      {pinyin}
                    </span>
                    <span 
                      className="card-hanzi" 
                      onClick={() => playAudio(card)}
                    >
                      {hanzi}
                    </span>
                  </div>
                  <div className="card-row-bottom">
                    <span className="card-meaning">{meaning}</span>
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
