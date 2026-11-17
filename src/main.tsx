import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

type NavigatorWithAudioSession = Navigator & {
  audioSession?: {
    type: string
  }
}

// Set dark mode permanently
document.documentElement.setAttribute('data-theme', 'dark');

// Keep spoken study audio audible when an iPhone's Ring/Silent switch is off.
const audioSession = (navigator as NavigatorWithAudioSession).audioSession
if (audioSession) {
  audioSession.type = 'playback'

  // Recent iOS versions can lose the playback category while still reporting
  // it as selected. Cycle the value before a tap so WebKit reapplies it before
  // the tap's click handler starts speech synthesis.
  document.addEventListener('pointerdown', () => {
    audioSession.type = 'ambient'
    window.setTimeout(() => {
      audioSession.type = 'playback'
    }, 0)
  }, { capture: true, passive: true })
}

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app still works
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
