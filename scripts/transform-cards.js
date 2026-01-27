import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cardsPath = path.join(__dirname, '../src/data/quizCards.json');
const decksPath = path.join(__dirname, '../src/data/decks.json');

// Load existing data
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
const decks = JSON.parse(fs.readFileSync(decksPath, 'utf-8'));

// Create a mapping from (section, deck) -> deckId
const sectionDeckToDeckId = {};
for (const [deckId, deckData] of Object.entries(decks)) {
  const key = `${deckData.section}|${deckData.deckName}`;
  sectionDeckToDeckId[key] = deckId;
}

console.log('Section/Deck to DeckId mapping:');
console.log(sectionDeckToDeckId);

// Transform cards
let transformedCount = 0;
let errorCount = 0;

const transformedCards = cards.map(card => {
  const key = `${card.section}|${card.deck}`;
  const deckId = sectionDeckToDeckId[key];
  
  if (!deckId) {
    console.error(`ERROR: No deckId found for section="${card.section}" deck="${card.deck}" (card id: ${card.id})`);
    errorCount++;
    return card; // Keep original if no mapping found
  }
  
  transformedCount++;
  
  // Create new card object with deckId, removing section and deck
  const { section, deck, ...rest } = card;
  return {
    id: rest.id,
    kind: rest.kind,
    deckId: deckId,
    level: rest.level,
    promptLine: rest.promptLine,
    question: rest.question,
    choices: rest.choices,
    correct: rest.correct,
    explanations: rest.explanations,
    tags: rest.tags,
    difficulty: rest.difficulty
  };
});

console.log(`\nTransformed ${transformedCount} cards`);
console.log(`Errors: ${errorCount}`);

if (errorCount === 0) {
  // Write the transformed data
  fs.writeFileSync(cardsPath, JSON.stringify(transformedCards, null, 2));
  console.log('\nSuccessfully wrote transformed quizCards.json');
} else {
  console.log('\nNOT writing file due to errors');
}
