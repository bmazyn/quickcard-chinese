import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StartPage from './components/StartPage'
import Books from './components/Books'
import BookDetail from './components/BookDetail'
import ChapterDetail from './components/ChapterDetail'
import LandingPage from './components/LandingPage'
import QuizFeed from './components/QuizFeed'
import AudioLoop from './components/AudioLoop'
import Speedrun from './components/Speedrun'
import BookReview from './components/BookReview'
import StudyList from './components/StudyList'
import RollingMatchPage from './components/RollingMatchPage'
import ThreeLayerMatch from './components/ThreeLayerMatch'
import MeaningRecall from './components/MeaningRecall'
import SayChinese from './components/SayChinese'
import SentenceBuilder from './components/SentenceBuilder'
import SentenceWordBank from './components/SentenceWordBank'
import SentenceSetOverview from './components/SentenceSetOverview'
import SentenceSetRun from './components/SentenceSetRun'
import SentenceSetTypingRun from './components/SentenceSetTypingRun'
import NotFound from './components/NotFound'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:bookId" element={<BookDetail />} />
        <Route path="/books/:bookId/review" element={<BookReview />} />
        <Route path="/chapters/:chapterId" element={<ChapterDetail />} />
        <Route path="/chapter/:chapterId" element={<ChapterDetail />} />
        <Route path="/chapters/:chapterId/bonus/rolling-match" element={<RollingMatchPage />} />
        <Route path="/chapter/:chapterId/bonus/rolling-match" element={<RollingMatchPage />} />
        <Route path="/chapters/:chapterId/bonus/3-layer-match" element={<ThreeLayerMatch />} />
        <Route path="/chapter/:chapterId/bonus/3-layer-match" element={<ThreeLayerMatch />} />
        <Route path="/chapters/:chapterId/bonus/meaning-recall" element={<MeaningRecall />} />
        <Route path="/chapter/:chapterId/bonus/meaning-recall" element={<MeaningRecall />} />
        <Route path="/chapters/:chapterId/bonus/say-chinese" element={<SayChinese />} />
        <Route path="/chapter/:chapterId/bonus/say-chinese" element={<SayChinese />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/quiz" element={<QuizFeed />} />
        <Route path="/audio-loop" element={<AudioLoop />} />
        <Route path="/speedrun" element={<Speedrun />} />
        <Route path="/study-list" element={<StudyList />} />
        <Route path="/sentence-builder" element={<SentenceBuilder />} />
        <Route path="/sentence-word-bank" element={<SentenceWordBank />} />
        <Route path="/sentence-set/:setId" element={<SentenceSetOverview />} />
        <Route path="/sentence-set/:setId/run" element={<SentenceSetRun />} />
        <Route path="/sentence-set/:setId/type" element={<SentenceSetTypingRun />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
