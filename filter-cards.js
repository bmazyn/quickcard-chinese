// Script to filter quizCards.json to Foundation decks only and add section field
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, 'src', 'data', 'quizCards.json');
const cards = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Filter to only include Foundation decks
const allowedDecks = ['Foundation 1', 'Numbers', 'Time 1', 'Greetings 1'];
const filteredCards = cards.filter(card => allowedDecks.includes(card.deck));

// Add section field to all remaining cards
const updatedCards = filteredCards.map(card => ({
  ...card,
  section: 'Foundation'
}));

// Write back to quizCards.json
fs.writeFileSync(dataPath, JSON.stringify(updatedCards, null, 2), 'utf8');

console.log(`Original cards: ${cards.length}`);
console.log(`Filtered cards: ${updatedCards.length}`);
console.log(`Kept decks: ${allowedDecks.join(', ')}`);
console.log('Added "section": "Foundation" to all cards');
