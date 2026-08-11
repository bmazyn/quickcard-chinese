import { useNavigate } from "react-router-dom";
import { getBookIds, getChaptersForBook } from "../utils/decks";
import {
  CHAPTER_REVIEW_TOP_SCORE_COUNT,
  getChapterReviewTopScores,
} from "../utils/chapterReview";
import "./ChapterReviewHome.css";

export default function ChapterReviewHome() {
  const navigate = useNavigate();
  const chapters = getBookIds().flatMap((book) =>
    getChaptersForBook(book).map((chapter) => ({
      book,
      chapter,
      scores: getChapterReviewTopScores(chapter),
    }))
  );

  return (
    <div className="chapter-review-home-page">
      <div className="chapter-review-home-scrollable">
        <div className="chapter-review-home-header">
          <button
            className="chapter-review-home-back-btn"
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="chapter-review-home-title">Chapter Review</h1>
        </div>

        <div className="chapter-review-home-list">
          {chapters.map(({ book, chapter, scores }) => (
            <button
              key={chapter}
              className="chapter-review-card"
              onClick={() => navigate(`/chapter-review/${chapter}/run`)}
            >
              <span className="chapter-review-card-name">
                Book {book} — Chapter {chapter}
              </span>
              <span
                className="chapter-review-card-scores"
                aria-label={scores.length > 0 ? `Top scores: ${scores.join(", ")}` : "Top scores: none yet"}
              >
                {Array.from({ length: CHAPTER_REVIEW_TOP_SCORE_COUNT }).map((_, index) => {
                  const score = scores[index];
                  return (
                    <span
                      key={index}
                      className={
                        "chapter-review-score-box" +
                        (score === undefined
                          ? ""
                          : score === 10
                            ? " chapter-review-score-box--green"
                            : score === 9
                              ? " chapter-review-score-box--yellow"
                              : " chapter-review-score-box--red")
                      }
                    >
                      {score}
                    </span>
                  );
                })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
