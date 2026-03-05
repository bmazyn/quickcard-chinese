import { useNavigate } from "react-router-dom";
import { getBookIds, getBookMasteryStats, getBookBestTime } from "../utils/decks";
import "./Books.css";

export default function Books() {
  const navigate = useNavigate();
  const bookIds = getBookIds();

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/books/${bookId}`);
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <div className="books-page">
      <div className="books-scrollable">
        <div className="books-header">
          <button className="books-home-icon" onClick={handleHome} aria-label="Back to start page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          <h1 className="books-title">QuickCard Chinese</h1>
        </div>

        <div className="books-list">
          {bookIds.map(bookId => {
            const { chaptersComplete, chaptersTotal } = getBookMasteryStats(bookId);
            const bestTime = getBookBestTime(bookId);
            const timeDisplay = bestTime !== null ? formatTime(bestTime) : "--:--";
            const isBookComplete = chaptersComplete === chaptersTotal && chaptersTotal > 0;

            return (
              <div 
                key={bookId}
                className="book-card"
                onClick={() => handleBookClick(bookId)}
              >
                <div className="book-card-header">
                  <h2 className="book-card-title">
                    Book {bookId}
                    {isBookComplete && <span className="book-completion-check">✓</span>}
                  </h2>
                </div>
                <div className="book-card-footer">
                  <span className="book-card-time">
                    ⏱️ {timeDisplay}
                  </span>
                  <span className="book-card-chapters">
                    {chaptersComplete} / {chaptersTotal} chapters
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
