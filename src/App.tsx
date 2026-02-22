import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StartPage from './components/StartPage'
import Chapters from './components/Chapters'
import ChapterDetail from './components/ChapterDetail'
import LandingPage from './components/LandingPage'
import QuizFeed from './components/QuizFeed'
import AudioLoop from './components/AudioLoop'
import Speedrun from './components/Speedrun'
import StudyList from './components/StudyList'
import RollingMatchPage from './components/RollingMatchPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/chapters" element={<Chapters />} />
        <Route path="/chapter/:chapterId" element={<ChapterDetail />} />
        <Route path="/chapter/:chapterId/bonus/rolling-match" element={<RollingMatchPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/quiz" element={<QuizFeed />} />
        <Route path="/audio-loop" element={<AudioLoop />} />
        <Route path="/speedrun" element={<Speedrun />} />
        <Route path="/study-list" element={<StudyList />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
