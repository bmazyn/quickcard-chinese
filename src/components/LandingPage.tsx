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

  useEffect(() => {
    localStorage.setItem("selectedLevels", JSON.stringify(selectedLevels));
  }, [selectedLevels]);

  const handleLevelToggle = (level: HSKLevel) => {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
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

        <div className="level-selection">
          <h2 className="level-title">Select Study Level</h2>
          <div className="level-checkboxes">
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1")}
                onChange={() => handleLevelToggle("HSK1")}
              />
              <span>HSK1</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1b")}
                onChange={() => handleLevelToggle("HSK1b")}
              />
              <span>HSK1b</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1-PHRASE")}
                onChange={() => handleLevelToggle("HSK1-PHRASE")}
              />
              <span>HSK1-PHRASE</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK1c")}
                onChange={() => handleLevelToggle("HSK1c")}
              />
              <span>HSK1c</span>
            </label>
            <label className="level-checkbox">
              <input
                type="checkbox"
                checked={selectedLevels.includes("HSK2")}
                onChange={() => handleLevelToggle("HSK2")}
              />
              <span>HSK2</span>
            </label>
          </div>
        </div>

        <button 
          className="start-button"
          onClick={handleStart}
          disabled={selectedLevels.length === 0}
        >
          Start
        </button>
      </div>
    </div>
  );
}
