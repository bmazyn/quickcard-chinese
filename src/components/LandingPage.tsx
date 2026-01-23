import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import quizCards from "../data/quizCards.json";
import "./LandingPage.css";

// Compute sections and decks from quizCards.json
const sections = Array.from(new Set(quizCards.map(card => card.section)));
const decksPerSection: Record<string, string[]> = {};
sections.forEach(section => {
  decksPerSection[section] = Array.from(
    new Set(quizCards.filter(card => card.section === section).map(card => card.deck))
  );
});

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Audio element for iOS Safari autoplay unlock
  const audioUnlockRef = useRef<HTMLAudioElement | null>(null);

  const [selectedDecks, setSelectedDecks] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedDecks");
    return saved ? JSON.parse(saved) : [];
  });

  const [masteredSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("quickcard_mastered_sections");
    return saved ? JSON.parse(saved) : {};
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get speedrun best time from localStorage
  const getSpeedrunTime = (section: string, isLocked: boolean): string => {
    if (isLocked) return "—:—";
    
    try {
      const key = `qc_speedrun_best_seconds:${section}`;
      const saved = localStorage.getItem(key);
      if (!saved) return "—:—";
      
      const missedKey = `qc_speedrun_last_misses:${section}`;
      const missedSaved = localStorage.getItem(missedKey);
      const missedCount = missedSaved ? parseInt(missedSaved, 10) : 0;
      
      return `${formatTime(parseInt(saved, 10))} / ${missedCount}`;
    } catch {
      return "—:—";
    }
  };

  useEffect(() => {
    localStorage.setItem("selectedDecks", JSON.stringify(selectedDecks));
  }, [selectedDecks]);

  const handleDeckToggle = (deck: string) => {
    setSelectedDecks(prev => 
      prev.includes(deck)
        ? prev.filter(d => d !== deck)
        : [...prev, deck]
    );
  };

  const toggleSectionCollapse = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSpeedrunClick = (section: string, isLocked: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent section collapse toggle
    if (!isLocked) {
      navigate(`/speedrun?section=${encodeURIComponent(section)}`);
    }
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
      <div className="landing-scrollable">
        <div className="landing-header">
          <button 
            className="theme-toggle-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <h1 className="landing-title">QuickCard</h1>
        </div>

        {/* Dynamic Sections */}
        {sections.map(section => {
          const decks = decksPerSection[section];
          const masteredCount = decks.filter(deck => masteredSections[deck]).length;
          const allMastered = decks.length > 0 && masteredCount === decks.length;
          const isCollapsed = collapsedSections[section] || false;
          const speedrunLocked = !allMastered;

          return (
            <div className="section" key={section}>
              <div className="section-header" onClick={() => toggleSectionCollapse(section)}>
                <div className="section-header-left">
                  <span className="section-chevron">{isCollapsed ? '▶' : '▼'}</span>
                  <h2 className="section-title">{section}</h2>
                </div>
                <span 
                  className={`section-time ${speedrunLocked ? 'locked' : 'unlocked'}`}
                  onClick={(e) => handleSpeedrunClick(section, speedrunLocked, e)}
                  title={speedrunLocked ? "Speedrun unlocks after mastering all decks" : "Start speedrun"}
                >
                  {getSpeedrunTime(section, speedrunLocked)}
                </span>
                <span className="section-mastery">
                  {masteredCount} / {decks.length} mastered
                </span>
              </div>
              
              {!isCollapsed && (
                <div className="blocks-grid">
                  {decks.map(deck => (
                    <div 
                      key={deck}
                      className={`block-card ${
                        selectedDecks.includes(deck) ? "selected" : ""
                      }`}
                      onClick={() => handleDeckToggle(deck)}
                    >
                      <span className="block-name">{deck}</span>
                      {masteredSections[deck] && <span className="block-mastery"></span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="start-button-footer">
        <button 
          className="play-audio-button"
          onClick={() => {
            navigate(`/audio-loop?decks=${encodeURIComponent(selectedDecks.join(','))}`);
          }}
          disabled={selectedDecks.length === 0}
        >
          🔊 Play Audio
        </button>
        <button 
          className="start-button"
          onClick={handleStart}
          disabled={selectedDecks.length === 0}
        >
          Start
        </button>
      </div>
    </div>
  );
}
