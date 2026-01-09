# QuickCard - Chinese Vocabulary Quiz PWA

A TikTok-style Chinese vocabulary quiz Progressive Web App built with React, TypeScript, and Vite.

## Features

- 📱 Mobile-first, thumb-friendly design
- 🎯 One quiz card at a time with instant feedback
- ✨ Auto-advance after answering (1 second delay)
- 🔄 Infinite deck with shuffling (no repeats until full cycle)
- 📊 Track current streak, best streak, and total correct answers
- 💾 Persistent stats using localStorage
- 📴 Fully offline-capable PWA
- 🌐 HSK1 vocabulary with multiple card types (vocab, phrases, sentences, contrasts)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## PWA Installation

The app is installable as a Progressive Web App:

1. Open the app in a browser (Chrome, Edge, Safari on iOS)
2. Click the install prompt or use browser's "Install App" option
3. The app will be added to your home screen and work offline

## Project Structure

```
src/
├── components/
│   ├── QuizCard.tsx       # Individual quiz card component
│   ├── QuizCard.css       # Card styling
│   ├── QuizFeed.tsx       # Main feed with shuffle logic
│   └── QuizFeed.css       # Feed styling
├── data/
│   └── quizCards.json     # 50 HSK1 quiz cards
├── types.ts               # TypeScript definitions
├── App.tsx                # Main app component
├── main.tsx               # App entry point
└── index.css              # Global styles
```

## Quiz Card Schema

Each quiz card follows this authoritative schema:

```typescript
{
  id: string;                    // Unique identifier
  kind: "vocab" | "sentence" | "phrase" | "contrast";
  promptLine: string;            // "pinyin — 汉字" format
  question: string;              // Question prompt
  choices: {                     // Answer choices (English)
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D"; // Correct answer
  explanations: {                // Feedback for each choice
    A: string;
    B: string;
    C: string;
    D: string;
  };
  tags: string[];                // Category tags
  difficulty: number;            // HSK level (1-6)
}
```

## Game Mechanics

- **Current Streak**: Increments on correct answers, resets to 0 on wrong answers
- **Best Streak**: Highest streak achieved (persisted in localStorage)
- **Total Correct**: Count of all correct answers ever (persisted in localStorage)
- **Shuffle Logic**: Fisher-Yates shuffle ensures no repeats within a cycle
- **Auto-Advance**: Automatically moves to next card after 1 second
- **Manual Next**: Click "Next" button to skip the delay

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **vite-plugin-pwa** - PWA support with Workbox
- **CSS3** - Styling with mobile-first approach

## License

MIT

## Icon Credits

Icons use the Chinese character 快 (kuài) meaning "quick/fast"
