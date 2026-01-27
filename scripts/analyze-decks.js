import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/quizCards.json'), 'utf-8'));

const combos = new Map();
data.forEach(card => {
  const key = `${card.section}|${card.deck}`;
  if (!combos.has(key)) {
    combos.set(key, []);
  }
  combos.get(key).push(card.id);
});

console.log('Section | Deck combinations:');
console.log('='.repeat(80));
Array.from(combos.entries()).sort().forEach(([key, ids]) => {
  const [section, deck] = key.split('|');
  console.log(`Section: "${section}" | Deck: "${deck}" | ${ids.length} cards`);
  console.log(`  First ID: ${ids[0]}, Last ID: ${ids[ids.length-1]}`);
});
