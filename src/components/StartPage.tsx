import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";
import "./StartPage.css";

export default function StartPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    // Check if the user has already visited
    const hasVisited = localStorage.getItem("qc_has_visited");
    if (hasVisited === "true") {
      // Skip start page and go directly to chapters
      navigate("/chapters", { replace: true });
    }
  }, [navigate]);

  const handleEnter = () => {
    // Mark as visited
    localStorage.setItem("qc_has_visited", "true");
    // Navigate to chapters page
    navigate("/chapters");
  };

  return (
    <div className="start-page">
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      
      <div className="start-content">
        <div className="start-logo">
          <div className="logo-character">快</div>
        </div>
        
        <h1 className="start-title">QuickCard</h1>
        
        <button className="start-enter-button" onClick={handleEnter}>
          Enter
        </button>
      </div>
    </div>
  );
}
