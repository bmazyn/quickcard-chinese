import { useNavigate } from "react-router-dom";
import { getBookIds, getBookMasteryStats, getBookBestTime, getChaptersForBook } from "../utils/decks";
import { getChapterListeningBest, chapterHasListeningCards } from "../utils/listeningChallenge";
import { getBookMeaningRecallRollup } from "../utils/meaningRecall";
import { getBook3LayerMatchRollup } from "../utils/threeLayerMatch";
import sentencesRaw from "../data/sentences.json";
import { setPercentComplete } from "../utils/sentenceSetProgress";
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

            // Calculate book listening challenge rollup
            const chapters = getChaptersForBook(bookId);
            let listeningCorrect = 0;
            let eligibleChapters = 0;
            
            chapters.forEach(chapter => {
              // Count eligible chapters (chapters with listening cards)
              if (chapterHasListeningCards(chapter)) {
                eligibleChapters++;
                
                // Sum correct answers from completed eligible chapters
                const result = getChapterListeningBest(chapter);
                if (result) {
                  listeningCorrect += result.correct;
                }
              }
            });
            
            // Total possible = eligible chapters × 25 questions per chapter
            const listeningTotal = eligibleChapters * 25;
            const hasListeningResult = eligibleChapters > 0;

            // Meaning Recall book rollup
            const { correct: mrCorrect, total: mrTotal, eligibleCount: mrEligible } =
              getBookMeaningRecallRollup(chapters);
            const hasMrResult = mrEligible > 0;

            // 3-Layer Match book rollup
            const tlmRollup = getBook3LayerMatchRollup(chapters);

            return (
              <div 
                key={bookId}
                className="book-card"
                onClick={() => handleBookClick(bookId)}
              >
                <div className="book-card-header">
                  <h2 className="book-card-title">
                    Book {bookId}
                  </h2>
                  <span className="book-card-chapters-badge">
                    {chaptersComplete}/{chaptersTotal} chapters
                    {isBookComplete && <span className="book-completion-check">✓</span>}
                  </span>
                </div>
                <div className="book-card-footer">
                  <span className="book-card-time">
                    ⏱️ {timeDisplay}
                  </span>
                  {hasListeningResult && (
                    <span className="book-card-listening">
                      🔊 {listeningCorrect} / {listeningTotal}
                    </span>
                  )}
                  {hasMrResult && (
                    <span className="book-card-mr">
                      ✍️ {mrCorrect} / {mrTotal}
                    </span>
                  )}
                  {tlmRollup !== null && (
                    <span className="book-card-tlm">
                      🔷 {formatTime(tlmRollup.totalSeconds)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="books-sentence-builder-btn"
          onClick={() => navigate('/sentence-builder')}
        >
          Sentence Builder (Type)
        </button>

        <div className="books-set-grid">
        {Array.from(
          new Set((sentencesRaw as { set: number; id: string }[]).map(s => s.set))
        ).sort((a, b) => a - b).map(setNum => {
          const ids = (sentencesRaw as { set: number; id: string }[])
            .filter(s => s.set === setNum)
            .map(s => s.id);
          const pct = setPercentComplete(ids);
          return (
            <button
              key={setNum}
              className="books-sentence-builder-btn"
              onClick={() => navigate(`/sentence-set/${setNum}`)}
            >
              Set {setNum} — {pct}%
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
