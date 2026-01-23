import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON file
const jsonPath = path.join(__dirname, 'src', 'data', 'quizCards.json');
const csvPath = path.join(__dirname, 'src', 'data', 'quizCards.csv');

const quizCards = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Define CSV headers
const headers = [
  'id',
  'kind',
  'section',
  'deck',
  'level',
  'promptLine',
  'question',
  'choiceA',
  'choiceB',
  'choiceC',
  'choiceD',
  'correct',
  'explanationA',
  'explanationB',
  'explanationC',
  'explanationD',
  'tags',
  'difficulty'
];

// Function to escape CSV values
function escapeCSV(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Build CSV rows
const rows = [headers.join(',')];

quizCards.forEach(card => {
  const row = [
    card.id,
    card.kind,
    card.section,
    card.deck,
    card.level,
    card.promptLine,
    card.question,
    card.choices?.A || '',
    card.choices?.B || '',
    card.choices?.C || '',
    card.choices?.D || '',
    card.correct,
    card.explanations?.A || '',
    card.explanations?.B || '',
    card.explanations?.C || '',
    card.explanations?.D || '',
    (card.tags || []).join(';'),
    card.difficulty
  ].map(escapeCSV);
  
  rows.push(row.join(','));
});

// Write CSV file
fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');

console.log(`✓ CSV file created successfully!`);
console.log(`  Total cards: ${quizCards.length}`);
console.log(`  Output: ${csvPath}`);
