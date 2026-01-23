import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StartPage from './components/StartPage'
import LandingPage from './components/LandingPage'
import QuizFeed from './components/QuizFeed'
import AudioLoop from './components/AudioLoop'
import Speedrun from './components/Speedrun'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/quiz" element={<QuizFeed />} />
        <Route path="/audio-loop" element={<AudioLoop />} />
        <Route path="/speedrun" element={<Speedrun />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
