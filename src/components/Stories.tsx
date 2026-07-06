import { useNavigate } from "react-router-dom";
import storiesData from "../data/stories.json";
import "./Stories.css";

interface StoryLine {
  hanzi: string;
  pinyin: string;
  english: string;
}

export interface Story {
  id: string;
  title: string;
  level: number;
  description: string;
  lines: StoryLine[];
}

const stories = storiesData as Story[];

export default function Stories() {
  const navigate = useNavigate();

  return (
    <div className="stories-page">
      <div className="stories-scrollable">
        <div className="stories-header">
          <button
            className="stories-back-btn"
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="stories-title">Short Stories</h1>
        </div>

        <div className="stories-list">
          {stories.map((story) => (
            <button
              key={story.id}
              className="story-card"
              onClick={() => navigate(`/stories/${story.id}`)}
            >
              <div className="story-card-title">{story.title}</div>
              <div className="story-card-desc">{story.description}</div>
              <div className="story-card-meta">{story.lines.length} lines</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
