import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import type { HSKLevel } from "../types";
import "./LandingPage.css";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
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
