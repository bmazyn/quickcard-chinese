import { useNavigate } from "react-router-dom";
import {
  getSortedListeningRecallGroups,
  getGroupProgress,
  MAX_COMPLETED_ROUNDS,
} from "../utils/listeningRecall";
import "./ListeningRecallHome.css";

export default function ListeningRecallHome() {
  const navigate = useNavigate();
  const groups = getSortedListeningRecallGroups();

  return (
    <div className="listening-recall-home-page">
      <div className="listening-recall-home-scrollable">
        <div className="listening-recall-home-header">
          <button
            className="listening-recall-home-back-btn"
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="listening-recall-home-title">Listening Recall</h1>
        </div>

        <div className="listening-recall-home-list">
          {groups.map(({ group }) => {
            const progress = getGroupProgress(group);
            return (
              <button
                key={group}
                className="listening-recall-group-card"
                onClick={() => navigate(`/listening-recall/${group}`)}
              >
                <span className="listening-recall-group-name">Group {group}</span>
                <span className="listening-recall-group-progress">
                  {Array.from({ length: MAX_COMPLETED_ROUNDS }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        "listening-recall-progress-box" +
                        (i < progress.completedRounds ? " filled" : "")
                      }
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
