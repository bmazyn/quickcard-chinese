import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the quizCards.json file
const filePath = path.join(__dirname, '../src/data/quizCards.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let modifiedCount = 0;
let alreadyTaggedCount = 0;

// Process each card
data.forEach((card, index) => {
  // Check if this is a reverse card (promptLine does NOT contain "—")
  const isReverseCard = !card.promptLine.includes('—');
  
  if (isReverseCard) {
    // Check if card has "reverse" in tags
    if (!card.tags) {
      // tags doesn't exist, create it with "reverse"
      card.tags = ["reverse"];
      modifiedCount++;
      console.log(`Card ${card.id}: Created tags array with "reverse"`);
    } else if (!card.tags.includes("reverse")) {
      // tags exists but doesn't include "reverse", add it
      card.tags.push("reverse");
      modifiedCount++;
      console.log(`Card ${card.id}: Added "reverse" to existing tags`);
    } else {
      // Already has "reverse" tag
      alreadyTaggedCount++;
    }
  }
});

// Write back to file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('\n=== Summary ===');
console.log(`Total cards processed: ${data.length}`);
console.log(`Cards modified: ${modifiedCount}`);
console.log(`Reverse cards already properly tagged: ${alreadyTaggedCount}`);
console.log(`\nFile updated: ${filePath}`);
