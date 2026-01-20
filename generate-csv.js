import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const data = require('./src/data/quizCards.json');

// Create CSV header
const rows = [['id', 'kind', 'level', 'deck', 'promptLine', 'pinyin', 'hanzi', 'question', 'correct', 'tags', 'difficulty']];

// Add each card as a row
data.forEach(card => {
  const [pinyin, hanzi] = (card.promptLine || '').split(' — ');
  rows.push([
    card.id,
    card.kind,
    card.level || '',
    card.deck || '',
    card.promptLine || '',
    pinyin || '',
    hanzi || '',
    card.question || '',
    card.correct || '',
    (card.tags || []).join(';'),
    card.difficulty || ''
  ]);
});

// Convert to CSV format
const csv = rows.map(row => 
  row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
).join('\n');

// Write to file
fs.writeFileSync('src/data/quizCards.csv', csv, 'utf8');
console.log('Created src/data/quizCards.csv with ' + (rows.length - 1) + ' cards');
