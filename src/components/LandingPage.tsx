import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import type { HSKLevel } from "../types";
import "./LandingPage.css";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Audio element for iOS Safari autoplay unlock
  const audioUnlockRef = useRef<HTMLAudioElement | null>(null);
  
  const [selectedLevels, setSelectedLevels] = useState<HSKLevel[]>(() => {
    const saved = localStorage.getItem("selectedLevels");
    return saved ? JSON.parse(saved) : ["HSK1"];
  });

  const [selectedDecks, setSelectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  });

  /*const [masteredSections, setMasteredSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("quickcard_mastered_sections");
    return saved ? JSON.parse(saved) : {};
  });*/
  const [masteredSections] = useState<Record<string, boolean>>(() => {
  const saved = localStorage.getItem("quickcard_mastered_sections");
  return saved ? JSON.parse(saved) : {};
});

  useEffect(() => {
    localStorage.setItem("selectedLevels", JSON.stringify(selectedLevels));
  }, [selectedLevels]);

  useEffect(() => {
    localStorage.setItem("selectedDecks", JSON.stringify(selectedDecks));
  }, [selectedDecks]);

  const handleLevelToggle = (level: HSKLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleDeckToggle = (deck: string) => {
    setSelectedDecks(prev => 
      prev.includes(deck)
        ? prev.filter(d => d !== deck)
        : [...prev, deck]
    );
  };

  const handleStart = () => {
    // iOS Safari requires audio.play() to be called within a user gesture
    // to enable autoplay. We play a silent audio and immediately pause it.
    if (!audioUnlockRef.current) {
      // Silent audio data URI (0.5 second silence)
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audioUnlockRef.current = new Audio(silentAudio);
    }
    
    // Play and immediately pause to unlock audio context (no audible sound)
    const audio = audioUnlockRef.current;
    audio.currentTime = 0;
    audio.load(); // Required for iOS Safari to properly initialize on first tap
    audio.play().catch(() => {
      // Ignore errors - some browsers may block even this
    }).finally(() => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    navigate("/quiz");
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1 className="landing-title">QuickCard</h1>
        
        <div className="theme-toggle-section">
          <button 
            className="theme-toggle-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Foundation Section */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Foundation</h2>
            <span className="section-mastery">
              {[
                masteredSections["Foundation 1"],
                masteredSections["Numbers"],
                masteredSections["Time 1"],
                masteredSections["Greetings 1"]
              ].filter(Boolean).length} / 4 mastered
            </span>
          </div>
          
          <div className="blocks-grid">
            <div 
              className={`block-card ${
                selectedDecks.includes("Foundation 1") ? "selected" : ""
              }`}
              onClick={() => handleDeckToggle("Foundation 1")}
            >
              <span className="block-name">Foundation 1</span>
              {masteredSections["Foundation 1"] && <span className="block-mastery">✅</span>}
            </div>
            
            <div 
              className={`block-card ${
                selectedDecks.includes("Numbers") ? "selected" : ""
              }`}
              onClick={() => handleDeckToggle("Numbers")}
            >
              <span className="block-name">Numbers</span>
              {masteredSections["Numbers"] && <span className="block-mastery">✅</span>}
            </div>
            
            <div 
              className={`block-card ${
                selectedDecks.includes("Time 1") ? "selected" : ""
              }`}
              onClick={() => handleDeckToggle("Time 1")}
            >
              <span className="block-name">Time 1</span>
              {masteredSections["Time 1"] && <span className="block-mastery">✅</span>}
            </div>
            
            <div 
              className={`block-card ${
                selectedDecks.includes("Greetings 1") ? "selected" : ""
              }`}
              onClick={() => handleDeckToggle("Greetings 1")}
            >
              <span className="block-name">Greetings 1</span>
              {masteredSections["Greetings 1"] && <span className="block-mastery">✅</span>}
            </div>
          </div>
          
          <button 
            className="speedrun-button"
            disabled={
              ![
                masteredSections["Foundation 1"],
                masteredSections["Numbers"],
                masteredSections["Time 1"],
                masteredSections["Greetings 1"]
              ].every(Boolean)
            }
          >
            🏃 Speedrun
          </button>
        </div>

        {/* Legacy Level Selection */}
        <div className="level-selection">
          <div className="level-checkboxes">
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1")}
                onChange={() => handleLevelToggle("HSK1")}
              />
              <span>HSK1 {masteredSections["HSK1"] && "✅"}</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1b")}
                onChange={() => handleLevelToggle("HSK1b")}
              />
              <span>HSK1b {masteredSections["HSK1b"] && "✅"}</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1-PHRASE")}
                onChange={() => handleLevelToggle("HSK1-PHRASE")}
              />
              <span>HSK1-PHRASE {masteredSections["HSK1-PHRASE"] && "✅"}</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1c")}
                onChange={() => handleLevelToggle("HSK1c")}
              />
              <span>HSK1c {masteredSections["HSK1c"] && "✅"}</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK2")}
                onChange={() => handleLevelToggle("HSK2")}
              />
              <span>HSK2 {masteredSections["HSK2"] && "✅"}</span>
            </label>
          </div>
        </div>

        <div className="start-button-footer">
          <button 
            className="play-audio-button"
            onClick={() => {
              if (selectedDecks.length > 0) {
                navigate(`/audio-loop?decks=${encodeURIComponent(selectedDecks.join(','))}`);
              } else if (selectedLevels.length > 0) {
                navigate(`/audio-loop?levels=${encodeURIComponent(selectedLevels.join(','))}`);
              }
            }}
            disabled={selectedLevels.length === 0 && selectedDecks.length === 0}
          >
            🔊 Play Audio
          </button>
          <button 
            className="start-button"
            onClick={handleStart}
            disabled={selectedLevels.length === 0 && selectedDecks.length === 0}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
