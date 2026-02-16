/* 
to run:
cd C:\Users\me1y3yf\Documents\quickcard-chinese\src\data
node json_to_csv.js
*/

import fs from "fs";

const cards = JSON.parse(fs.readFileSync("quizCards.json", "utf8"));
const decks = JSON.parse(fs.readFileSync("decks.json", "utf8"));

const headers = [
  "id","kind","chapter","section","deck",
  "promptLine",
  "answer",
  "tags",
  "choice_A","choice_B","choice_C","choice_D",
  "difficulty"
];

const rows = [];
rows.push(headers.join(","));

for (const c of cards) {
  const deckMeta = decks[c.deckId] || {};
  const correctKey = c.correct;
  const answer = c.choices?.[correctKey] ?? "";

  rows.push([
    c.id ?? "",
    c.kind ?? "",
    deckMeta.chapter ?? "",
    JSON.stringify(deckMeta.section ?? ""),
    JSON.stringify(deckMeta.deckName ?? ""),
    JSON.stringify(c.promptLine ?? ""),
    JSON.stringify(answer),
    (c.tags || []).join("|"),
    JSON.stringify(c.choices?.A ?? ""),
    JSON.stringify(c.choices?.B ?? ""),
    JSON.stringify(c.choices?.C ?? ""),
    JSON.stringify(c.choices?.D ?? ""),
    c.difficulty ?? ""
  ].join(","));
}

/* UTF-8 BOM for Excel */
const BOM = "\uFEFF";
fs.writeFileSync("cards.csv", BOM + rows.join("\n"), "utf8");

console.log("✅ cards.csv created from quizCards.json");
