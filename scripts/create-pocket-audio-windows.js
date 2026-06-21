/**
 * create-pocket-audio-windows.js
 *
 * Generates a pocket MP3 audio file for a QuickCard Chinese chapter using
 * Windows built-in TTS voices (no internet, no paid APIs).
 *
 * Audio pattern per card:
 *   [Chinese hanzi]  →  [English]  →  [Chinese hanzi]  →  [pause N seconds]
 *
 * Usage:
 *   npm run audio:chapter -- --chapter 4
 *   npm run audio:chapter -- --chapter 4 --pause 1.5
 *   npm run audio:chapter -- --chapter 4 --zhVoice "Microsoft Huihui Desktop"
 *   npm run audio:chapter -- --chapter 4 --enVoice "Microsoft Zira Desktop"
 *   npm run audio:chapter -- --deckId travel4-food1
 */

import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ─── Chinese character range ───────────────────────────────────────────────────
const HAS_CHINESE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

// Dash separator in promptLine: "pinyin — hanzi"
// Uses Unicode escapes to be safe against file-encoding differences.
// U+2014 = em dash (—), U+2013 = en dash (–), U+002D = hyphen (-)
const DASH_SEP = / [\u2014\u2013\u002D] /;

// Preferred voice substrings (case-insensitive, first match wins)
const ZH_PREFS = ['huihui', 'kangkang', 'yaoyao', 'hanhan', 'lili', 'zhiwei'];
const EN_PREFS = ['zira', 'david', 'mark', 'aria', 'jenny', 'hazel', 'george'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLI argument parsing
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs() {
  const raw   = process.argv.slice(2);
  const opts  = {
    chapter:  null,   // filter by chapter number
    deckId:   null,   // filter by specific deck ID
    pause:    1,      // seconds of silence between cards
    zhVoice:  null,   // override Chinese TTS voice name
    enVoice:  null,   // override English TTS voice name
  };

  for (let i = 0; i < raw.length; i++) {
    if (!raw[i].startsWith('--')) continue;
    const key = raw[i].slice(2);
    const val = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[i + 1] : null;

    switch (key) {
      case 'chapter':  if (val) { opts.chapter  = parseInt(val, 10); i++; } break;
      case 'deckId':   if (val) { opts.deckId   = val;               i++; } break;
      case 'pause':    if (val) { opts.pause    = parseFloat(val);   i++; } break;
      case 'zhVoice':  if (val) { opts.zhVoice  = val;               i++; } break;
      case 'enVoice':  if (val) { opts.enVoice  = val;               i++; } break;
    }
  }
  return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Load data files
// ─────────────────────────────────────────────────────────────────────────────
function loadData() {
  const cardsPath = path.join(ROOT, 'src', 'data', 'quizCards.json');
  const decksPath = path.join(ROOT, 'src', 'data', 'decks.json');

  if (!fs.existsSync(cardsPath)) {
    die(`Card data not found: ${cardsPath}`);
  }
  if (!fs.existsSync(decksPath)) {
    die(`Deck data not found: ${decksPath}`);
  }

  console.log(`\n📂  Card data : ${cardsPath}`);
  console.log(`📂  Deck data : ${decksPath}`);

  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
  const decks = JSON.parse(fs.readFileSync(decksPath, 'utf-8'));
  return { cards, decks };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Extract Chinese / English from a single card
// ─────────────────────────────────────────────────────────────────────────────
function extractCard(card) {
  const tags       = card.tags || [];
  const promptLine = (card.promptLine || '').trim();

  // Skip reverse-direction cards (English → Chinese).
  // The same vocabulary appears in forward-direction cards which we do process.
  if (tags.includes('reverse')) return null;

  // promptLine format for forward cards:  "pinyin — hanzi"
  const match = promptLine.match(DASH_SEP);
  if (!match) return null;

  const sepIdx = promptLine.indexOf(match[0]);
  const pinyin = promptLine.slice(0, sepIdx).trim();
  const hanzi  = promptLine.slice(sepIdx + match[0].length).trim();

  // Confirm the right-hand side actually contains Chinese characters
  if (!HAS_CHINESE.test(hanzi)) return null;

  // English = the text of the correct answer choice
  const correctKey = card.correct;
  const english    = (card.choices?.[correctKey] || '').trim();
  if (!english) return null;

  return { hanzi, pinyin, english };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Deduplication (by normalised Chinese + English key)
// ─────────────────────────────────────────────────────────────────────────────
function normalise(s) {
  return s.toLowerCase().replace(/[\s.,!?'"，。！？「」""'']/g, '');
}

function deduplicate(cards) {
  const seen = new Set();
  const out  = [];
  for (const c of cards) {
    const key = `${normalise(c.hanzi)}|${normalise(c.english)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PowerShell helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Find powershell.exe or pwsh.exe on this machine */
function findPowerShell() {
  for (const exe of ['powershell', 'pwsh']) {
    try {
      execFileSync(exe, ['-NoProfile', '-Command', 'exit 0'], { stdio: 'pipe' });
      return exe;
    } catch { /* try next */ }
  }
  die('PowerShell not found. Please install it: https://microsoft.com/powershell');
}

/** Returns array of installed TTS voice names */
function listVoices(psExe, ps1Path) {
  try {
    const out = execFileSync(
      psExe,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
       '-File', ps1Path, '-ListVoices'],
      { encoding: 'utf-8' }
    );
    return out.trim().split('\n').map(v => v.trim()).filter(Boolean);
  } catch (e) {
    console.warn('⚠️   Could not list TTS voices:', e.message);
    return [];
  }
}

/** Run the PS1 script to speak all segments to WAV files */
function runTts(psExe, ps1Path, segmentsJsonPath) {
  execFileSync(
    psExe,
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
     '-File', ps1Path, '-SegmentsFile', segmentsJsonPath],
    { stdio: 'inherit' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Voice selection
// ─────────────────────────────────────────────────────────────────────────────
function pickVoice(voices, prefs, label) {
  for (const pref of prefs) {
    const hit = voices.find(v => v.toLowerCase().includes(pref));
    if (hit) return hit;
  }
  // Fallback to first available voice
  if (voices.length > 0) {
    console.warn(`⚠️   No preferred ${label} voice found – using "${voices[0]}" as fallback.`);
    return voices[0];
  }
  die(`No TTS voice found for ${label}. Install a Windows TTS voice pack.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ffmpeg helpers
// ─────────────────────────────────────────────────────────────────────────────
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a silent WAV file of the given duration.
 * Uses ffmpeg's lavfi anullsrc, 22050 Hz, mono (matches common Windows TTS output).
 */
function makeSilence(outputPath, durationSec) {
  const dur = durationSec.toFixed(3);
  runFfmpeg(
    `-y -f lavfi -i anullsrc=r=22050:cl=mono -t ${dur} -ar 22050 -ac 1 "${outputPath}"`
  );
}

/**
 * Build an ffmpeg concat list and merge all WAVs → one WAV.
 * Normalises to 22050 Hz mono so different TTS voice sample rates don't clash.
 */
function concatWavs(wavList, concatListPath, outputPath) {
  // ffmpeg concat demuxer requires forward-slash paths and single-quoted entries
  const lines = wavList
    .map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}' `)
    .join('\n');
  fs.writeFileSync(concatListPath, lines, 'utf-8');

  runFfmpeg(
    `-y -f concat -safe 0 -i "${concatListPath}" -ar 22050 -ac 1 "${outputPath}"`
  );
}

/** Convert WAV → MP3 using libmp3lame (VBR quality 4 ≈ 165 kbps) */
function wavToMp3(wavPath, mp3Path) {
  runFfmpeg(`-y -i "${wavPath}" -codec:a libmp3lame -qscale:a 4 "${mp3Path}"`);
}

function runFfmpeg(argsStr) {
  try {
    execSync(`ffmpeg ${argsStr}`, { stdio: 'pipe' });
  } catch (e) {
    const msg = e.stderr?.toString() || e.stdout?.toString() || e.message;
    die(`ffmpeg failed:\n${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Utility
// ─────────────────────────────────────────────────────────────────────────────
function die(msg) {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Main
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  QuickCard Chinese – Pocket Audio Generator (Windows)   ');
  console.log('══════════════════════════════════════════════════════════');

  // ── Parse args ──────────────────────────────────────────────────────────
  const opts = parseArgs();

  if (!opts.chapter && !opts.deckId) {
    die('Provide --chapter <number>  or  --deckId <id>\n\n' +
        '  npm run audio:chapter -- --chapter 4\n' +
        '  npm run audio:chapter -- --deckId travel4-food1');
  }

  // ── Load data ────────────────────────────────────────────────────────────
  const { cards, decks } = loadData();

  // ── Determine target deck IDs ────────────────────────────────────────────
  let targetDeckIds;

  if (opts.deckId) {
    if (!decks[opts.deckId]) {
      die(`Unknown deckId "${opts.deckId}". Check src/data/decks.json for valid IDs.`);
    }
    targetDeckIds = new Set([opts.deckId]);
    console.log(`\n🗂️   Filtering by deckId : ${opts.deckId} (${decks[opts.deckId].deckName})`);
  } else {
    const chapterDecks = Object.entries(decks)
      .filter(([, d]) => d.chapter === opts.chapter);

    if (chapterDecks.length === 0) {
      die(`No decks found for chapter ${opts.chapter}. Check src/data/decks.json.`);
    }

    targetDeckIds = new Set(chapterDecks.map(([id]) => id));
    console.log(`\n📖  Chapter ${opts.chapter} — ${chapterDecks.length} deck(s):`);
    chapterDecks.forEach(([id, d]) => console.log(`     • ${id.padEnd(24)} ${d.deckName}`));
  }

  // ── Filter & extract cards ───────────────────────────────────────────────
  const chapterCards = cards.filter(c => targetDeckIds.has(c.deckId));
  console.log(`\n📊  Total cards in scope    : ${chapterCards.length}`);

  const extracted = [];
  let skipped = 0;

  for (const c of chapterCards) {
    const data = extractCard(c);
    if (data) extracted.push(data);
    else      skipped++;
  }
  console.log(`    Skipped (reverse/invalid): ${skipped}`);

  const deduped = deduplicate(extracted);
  console.log(`    After deduplication      : ${deduped.length} unique cards`);

  if (deduped.length === 0) {
    die('No processable cards found. Verify --chapter / --deckId value.');
  }

  // ── Paths ────────────────────────────────────────────────────────────────
  const label          = opts.deckId
    ? `deck-${opts.deckId}`
    : `chapter-${opts.chapter}`;
  const outDir         = path.join(ROOT, 'output', 'audio');
  const tmpDir         = path.join(outDir, 'tmp');
  const txtPath        = path.join(outDir, `quickcard-${label}-pocket-audio.txt`);
  const mergedWavPath  = path.join(tmpDir, 'merged.wav');
  const concatListPath = path.join(tmpDir, 'concat_list.txt');
  const segmentsPath   = path.join(tmpDir, 'segments.json');
  const mp3Path        = path.join(outDir, `quickcard-${label}-pocket-audio.mp3`);
  const ps1Path        = path.join(__dirname, 'speak-to-wav.ps1');

  fs.mkdirSync(tmpDir, { recursive: true });

  // ── Write text preview ───────────────────────────────────────────────────
  const previewLines = [];
  for (const card of deduped) {
    previewLines.push(card.hanzi);
    previewLines.push(card.english);
    previewLines.push(card.hanzi);
    previewLines.push(`[PAUSE ${opts.pause} SECOND${opts.pause !== 1 ? 'S' : ''}]`);
    previewLines.push('');
  }
  fs.writeFileSync(txtPath, previewLines.join('\n'), 'utf-8');
  console.log(`\n📝  Preview TXT : ${txtPath}`);

  // ── Check ffmpeg ─────────────────────────────────────────────────────────
  if (!checkFfmpeg()) {
    die(
      'ffmpeg is not installed or not in PATH.\n\n' +
      '  Install ffmpeg:  https://ffmpeg.org/download.html\n' +
      '  Quick install (winget):  winget install ffmpeg\n' +
      '  Quick install (choco):   choco install ffmpeg\n\n' +
      '  Alternatively, add the ffmpeg bin folder to your system PATH,\n' +
      '  then re-run this script.\n\n' +
      `  ⚠️  Audio preview TXT has been saved to:\n  ${txtPath}`
    );
  }

  // ── Find PowerShell ──────────────────────────────────────────────────────
  const psExe = findPowerShell();
  console.log(`\n💻  PowerShell : ${psExe}`);

  // ── List & select voices ─────────────────────────────────────────────────
  console.log('\n🔊  Scanning installed TTS voices...');
  const voices = listVoices(psExe, ps1Path);

  if (voices.length === 0) {
    die('No TTS voices found. Install a Windows TTS language pack and try again.');
  }

  console.log(`    Found ${voices.length} voice(s):`);
  voices.forEach(v => console.log(`     • ${v}`));

  // Validate user-supplied voices exist in the list
  if (opts.zhVoice && !voices.some(v => v.toLowerCase() === opts.zhVoice.toLowerCase())) {
    console.warn(`⚠️   --zhVoice "${opts.zhVoice}" not found in installed voices – will try anyway.`);
  }
  if (opts.enVoice && !voices.some(v => v.toLowerCase() === opts.enVoice.toLowerCase())) {
    console.warn(`⚠️   --enVoice "${opts.enVoice}" not found in installed voices – will try anyway.`);
  }

  const zhVoice = opts.zhVoice || pickVoice(voices, ZH_PREFS, 'Chinese');
  const enVoice = opts.enVoice || pickVoice(voices, EN_PREFS, 'English');

  console.log(`\n🀄   Chinese voice : ${zhVoice}`);
  console.log(`🔤  English voice  : ${enVoice}`);

  // ── Build TTS segments & WAV file list ───────────────────────────────────
  console.log('\n⏱️   Generating silence WAV files...');
  const shortPausePath = path.join(tmpDir, 'pause_short.wav');
  const longPausePath  = path.join(tmpDir, `pause_${opts.pause}s.wav`);
  makeSilence(shortPausePath, 0.4);   // between lines within a card
  makeSilence(longPausePath, opts.pause);  // between cards

  const segments = [];   // handed to speak-to-wav.ps1
  const wavList  = [];   // ordered list for ffmpeg concat

  for (let i = 0; i < deduped.length; i++) {
    const { hanzi, english } = deduped[i];

    const zh1 = path.join(tmpDir, `card_${i}_zh1.wav`);
    const en  = path.join(tmpDir, `card_${i}_en.wav`);
    const zh2 = path.join(tmpDir, `card_${i}_zh2.wav`);

    // Chinese voice, slightly slower for learner clarity
    segments.push({ voice: zhVoice, rate: -2, text: hanzi,   outputPath: zh1 });
    // English voice, normal speed
    segments.push({ voice: enVoice, rate:  0, text: english, outputPath: en  });
    // Chinese voice again
    segments.push({ voice: zhVoice, rate: -2, text: hanzi,   outputPath: zh2 });

    // Concat order: zh1 · short pause · english · short pause · zh2 · long pause
    wavList.push(zh1, shortPausePath, en, shortPausePath, zh2, longPausePath);
  }

  // ── Generate WAV segments via PowerShell TTS ─────────────────────────────
  fs.writeFileSync(segmentsPath, JSON.stringify(segments, null, 2), 'utf-8');

  console.log(`\n🎙️   Running TTS  (${segments.length} segments for ${deduped.length} cards)...`);
  runTts(psExe, ps1Path, segmentsPath);

  // ── Concatenate all WAVs ─────────────────────────────────────────────────
  console.log('\n🔗  Concatenating WAV segments...');
  concatWavs(wavList, concatListPath, mergedWavPath);

  // ── Convert to MP3 ───────────────────────────────────────────────────────
  console.log('🎵  Converting WAV → MP3...');
  wavToMp3(mergedWavPath, mp3Path);

  // ── Clean up temp files ───────────────────────────────────────────────────
  console.log('🧹  Cleaning up temp files...');
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
    console.warn(`⚠️   Could not remove tmp dir: ${e.message}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  ✅  Done!');
  console.log(`  🎵  MP3     : ${mp3Path}`);
  console.log(`  📝  Preview : ${txtPath}`);
  console.log(`  🃏  Cards   : ${deduped.length}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

main();
