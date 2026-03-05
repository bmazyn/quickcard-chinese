import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StartPage from './components/StartPage'
import Books from './components/Books'
import BookDetail from './components/BookDetail'
import ChapterDetail from './components/ChapterDetail'
import LandingPage from './components/LandingPage'
import QuizFeed from './components/QuizFeed'
import AudioLoop from './components/AudioLoop'
import Speedrun from './components/Speedrun'
import StudyList from './components/StudyList'
import RollingMatchPage from './components/RollingMatchPage'
import NotFound from './components/NotFound'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:bookId" element={<BookDetail />} />
        <Route path="/chapters/:chapterId" element={<ChapterDetail />} />
        <Route path="/chapter/:chapterId" element={<ChapterDetail />} />
        <Route path="/chapters/:chapterId/bonus/rolling-match" element={<RollingMatchPage />} />
        <Route path="/chapter/:chapterId/bonus/rolling-match" element={<RollingMatchPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/quiz" element={<QuizFeed />} />
        <Route path="/audio-loop" element={<AudioLoop />} />
        <Route path="/speedrun" element={<Speedrun />} />
        <Route path="/study-list" element={<StudyList />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
