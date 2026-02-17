import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { QuizCard } from "../types";
import quizCardsData from "../data/quizCards.json";
import { getDeckIdByName } from "../utils/decks";
import "./AudioLoop.css";

export default function AudioLoop() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const decksParam = searchParams.get("decks") || "";
  const levelsParam = searchParams.get("levels") || "";
  const sectionParam = searchParams.get("section") || "";
  const chapterId = location.state?.chapterId;

  const [cards, setCards] = useState<QuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [displayTitle, setDisplayTitle] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Load cards for the selected decks/levels
  useEffect(() => {
    let sectionCards: QuizCard[] = [];
    let title = "Audio Loop";
    
    if (decksParam) {
      // Load selected decks (decksParam contains deck names)
      const selectedDeckNames = decksParam.split(',');
      const selectedDeckIds = selectedDeckNames
        .map(name => getDeckIdByName(name))
        .filter((id): id is string => id !== undefined);
      
      sectionCards = quizCardsData.filter((card) => 
        selectedDeckIds.includes(card.deckId)
      ) as QuizCard[];
      title = selectedDeckNames.length === 1 ? selectedDeckNames[0] : `${selectedDeckNames.length} Decks`;
    } else if (levelsParam) {
      // Load selected levels
      const selectedLevels = levelsParam.split(',');
      sectionCards = quizCardsData.filter((card) => 
        card.level && selectedLevels.includes(card.level)
      ) as QuizCard[];
      title = selectedLevels.length === 1 ? selectedLevels[0] : `${selectedLevels.length} Levels`;
    } else if (sectionParam === "Foundation") {
      // Legacy support: Load all Foundation decks
      const foundationDeckNames = ["Foundation 1", "Numbers", "Time 1", "Greetings 1"];
      const foundationDeckIds = foundationDeckNames
        .map(name => getDeckIdByName(name))
        .filter((id): id is string => id !== undefined);
      
      sectionCards = quizCardsData.filter((card) => 
        foundationDeckIds.includes(card.deckId)
      ) as QuizCard[];
      title = "Foundation";
    }
    
    const chineseCards = sectionCards.filter((card) => 
      /[\u4e00-\u9fff]/.test(card.promptLine)
    );
    
    setCards(chineseCards);
    setDisplayTitle(title);
  }, [decksParam, levelsParam, sectionParam]);

  // Parse pinyin and hanzi from promptLine (format: "pinyin — hanzi")
  const parseCard = (card: QuizCard) => {
    const parts = card.promptLine.split(" — ");
    return {
      pinyin: parts[0] || "",
      hanzi: parts[1] || "",
      meaning: card.choices[card.correct],
    };
  };

  // Play audio sequence for current card
  const playCardAudio = async (cardIndex: number) => {
    if (cardIndex >= cards.length) {
      // Loop back to start
      setCurrentIndex(0);
      if (isPlaying && !isPaused) {
        timeoutRef.current = window.setTimeout(() => playCardAudio(0), 1000);
      }
      return;
    }

    const card = cards[cardIndex];
    const { hanzi, meaning } = parseCard(card);

    // Play Chinese audio using speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(hanzi);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      
      speechSynthesis.speak(utterance);
      await new Promise((resolve) => {
        utterance.onend = resolve;
      });
    }

    if (!isPlaying || isPaused) return;

    // Pause between Chinese and English
    await new Promise((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, 800);
    });

    if (!isPlaying || isPaused) return;

    // Play English audio (TTS or fallback to speech synthesis)
    const englishAudio = new Audio(`/audio/${card.id}_english.mp3`);
    audioRef.current = englishAudio;

    try {
      await englishAudio.play();
      await new Promise((resolve) => {
        englishAudio.onended = resolve;
      });
    } catch {
      // Fallback to speech synthesis with English voice
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
        
        const utterance = new SpeechSynthesisUtterance(meaning);
        utterance.lang = 'en-US';
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
        await new Promise((resolve) => {
          utterance.onend = resolve;
        });
      }
    }

    if (!isPlaying || isPaused) return;

    // Pause before next card
    await new Promise((resolve) => {
      timeoutRef.current = window.setTimeout(resolve, 1500);
    });

    if (!isPlaying || isPaused) return;

    // Advance to next card
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  // Handle play button
  const handlePlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
  };

  // Handle pause button
  const handlePause = () => {
    setIsPaused(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Handle stop button
  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Auto-play when play state changes
  useEffect(() => {
    if (isPlaying && !isPaused && cards.length > 0) {
      playCardAudio(currentIndex);
    }
  }, [isPlaying, isPaused, currentIndex, cards]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Guard: Reset index if out of bounds
  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="audio-loop">
        <div className="audio-loop-content">
          <div className="audio-loop-header">
          <button className="home-icon" onClick={() => {
            try {
              navigate(-1);
            } catch {
              if (chapterId) {
                navigate(`/chapter/${chapterId}`);
              } else {
                navigate("/");
              }
            }
          }} aria-label="Go back">
            ← Back
            </button>
            <h2 className="audio-loop-title">{displayTitle}</h2>
          </div>
          <p className="no-cards">No cards found for this section</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const { pinyin, hanzi, meaning } = parseCard(currentCard);

  return (
    <div className="audio-loop">
      <div className="audio-loop-content">
        <div className="audio-loop-header">
          <button className="home-icon" onClick={() => {
            handleStop();
            try {
              navigate(-1);
            } catch {
              if (chapterId) {
                navigate(`/chapter/${chapterId}`);
              } else {
                navigate("/");
              }
            }
          }} aria-label="Go back">
            ← Back
          </button>
          <h2 className="audio-loop-title">{displayTitle}</h2>
        </div>

        <div className="audio-loop-card">
          <div className="card-counter">
            {currentIndex + 1} / {cards.length}
          </div>
          <div className="card-pinyin">{pinyin}</div>
          <div className="card-hanzi">{hanzi}</div>
          <div className="card-meaning">{meaning}</div>
        </div>

        <div className="audio-controls">
          {!isPlaying || isPaused ? (
            <button className="control-button play-button" onClick={handlePlay}>
              ▶️ Play
            </button>
          ) : (
            <button className="control-button pause-button" onClick={handlePause}>
              ⏸️ Pause
            </button>
          )}
          <button className="control-button stop-button" onClick={handleStop}>
            ⏹️ Stop
          </button>
        </div>
      </div>
    </div>
  );
}
