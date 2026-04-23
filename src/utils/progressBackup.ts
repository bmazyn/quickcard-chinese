/**
 * Progress Backup Utility
 * Exports and imports QuickCard progress data from localStorage
 *
 * Schema versions:
 *   1 – original (qc_* and quickcard_* keys only)
 *   2 – added bestStreak, totalCorrect, rollingBestTime_ch* keys;
 *       excluded transient qc_practice_* session keys from export
 */

interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, string>;
}

/**
 * Keys that are purely transient session data – never back these up.
 * They are written at the start of a speedrun-practice flow and removed
 * when the practice session ends, so they carry no meaningful progress.
 */
const TRANSIENT_KEY_PREFIXES = [
  'qc_practice_',   // qc_practice_cards, qc_practice_source, qc_practice_deck, qc_practice_section
];

/**
 * Keys that are app-lifecycle flags, not progress.
 * We exclude them from export so a restore never accidentally changes
 * navigation state on the target device.
 */
const EXCLUDED_EXACT_KEYS = new Set([
  'qc_has_visited',   // "has the user seen the start screen?" – navigation flag
]);

/**
 * Checks if a key holds QuickCard progress data that should be
 * included in an export / restored by an import.
 */
function isQuickCardProgressKey(key: string): boolean {
  // Never export transient session keys
  if (TRANSIENT_KEY_PREFIXES.some((p) => key.startsWith(p))) {
    return false;
  }

  // Never export lifecycle / navigation flags
  if (EXCLUDED_EXACT_KEYS.has(key)) {
    return false;
  }

  // ── qc_* namespace ──────────────────────────────────────────────────────
  // Covers: qc_deck_speedrun_best:*, qc_listening_challenge:*, qc_say_chinese:*,
  //         qc_meaning_recall:*, qc_3lm_best:*, qc_book_review_pool:*,
  //         qc_book_review_top10:*, qc_match_sound (sound pref – harmless to keep)
  if (key.startsWith('qc_')) {
    return true;
  }

  // ── quickcard_* namespace ────────────────────────────────────────────────
  // Covers: quickcard_mastered_sections, any future quickcard_* progress keys.
  // Exclude non-progress variants (timekeeper, time-slots) as before.
  if (
    key.startsWith('quickcard_') &&
    !key.includes('timekeeper') &&
    !key.includes('time-slots')
  ) {
    return true;
  }

  // ── Legacy bare keys ─────────────────────────────────────────────────────
  // bestStreak / totalCorrect – QuizFeed cumulative stats (no namespace prefix)
  if (key === 'bestStreak' || key === 'totalCorrect') {
    return true;
  }

  // rollingBestTime_ch<N> – RollingMatchPage per-chapter best times
  // (written before the key was migrated to the qc_ namespace)
  if (key.startsWith('rollingBestTime_ch')) {
    return true;
  }

  return false;
}

/**
 * Exports all QuickCard progress data to a JSON file
 */
export function exportProgress(): void {
  const data: Record<string, string> = {};
  
  // Collect all QuickCard progress keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isQuickCardProgressKey(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    }
  }

  const backup: BackupData = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data
  };

  // Create blob and download
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quickcard-progress-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports QuickCard progress data from a JSON file
 * @param file - The JSON file to import
 */
export async function importProgress(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backup: BackupData = JSON.parse(text);
        
        // Validate JSON structure
        if (!backup.schemaVersion || typeof backup.schemaVersion !== 'number') {
          alert('Invalid backup file: missing or invalid schemaVersion');
          reject(new Error('Invalid schemaVersion'));
          return;
        }
        
        if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
          alert('Invalid backup file: data must be an object');
          reject(new Error('Invalid data structure'));
          return;
        }

        // Count keys to import - include all QuickCard progress keys.
        // For forward-compatibility, silently skip any key that does not
        // pass the current filter (e.g. keys from a future schema version
        // we don't understand yet).
        const keysToImport = Object.keys(backup.data).filter(key => isQuickCardProgressKey(key));
        if (keysToImport.length === 0) {
          alert('No QuickCard progress data found in backup file');
          reject(new Error('No data to import'));
          return;
        }

        // Build a human-readable summary of what sections are in the backup
        const sections: string[] = [];
        const hasMastered = keysToImport.some(k => k.startsWith('quickcard_mastered'));
        const hasStreak    = keysToImport.some(k => k === 'bestStreak' || k === 'totalCorrect');
        const hasSpeedrun  = keysToImport.some(k => k.startsWith('qc_deck_speedrun_best'));
        const hasListening = keysToImport.some(k => k.startsWith('qc_listening_challenge'));
        const hasSayCh     = keysToImport.some(k => k.startsWith('qc_say_chinese'));
        const hasMeanRec   = keysToImport.some(k => k.startsWith('qc_meaning_recall'));
        const has3LM       = keysToImport.some(k => k.startsWith('qc_3lm_best'));
        const hasRolling   = keysToImport.some(k => k.startsWith('rollingBestTime_ch'));
        const hasBRPool    = keysToImport.some(k => k.startsWith('qc_book_review_pool'));
        const hasBRTop10   = keysToImport.some(k => k.startsWith('qc_book_review_top10'));
        if (hasMastered)  sections.push('• Deck mastery');
        if (hasStreak)    sections.push('• Best streak / total correct');
        if (hasSpeedrun)  sections.push('• Speedrun best times');
        if (hasListening) sections.push('• Listening Challenge bests');
        if (hasSayCh)     sections.push('• Say Chinese bests');
        if (hasMeanRec)   sections.push('• Meaning Recall bests');
        if (has3LM)       sections.push('• 3-Layer Match bests');
        if (hasRolling)   sections.push('• Rolling Match bests');
        if (hasBRPool)    sections.push('• Book Review pool');
        if (hasBRTop10)   sections.push('• Book Review top-10 scores');

        // Show confirmation dialog
        const confirmed = window.confirm(
          `Restore progress from backup (${backup.exportedAt})?\n\n` +
          `Sections found (${keysToImport.length} items):\n` +
          (sections.length > 0 ? sections.join('\n') : '• (misc progress keys)') +
          '\n\nImported data will be merged with your current progress.\n' +
          'Existing keys not present in the backup are left untouched.\n\n' +
          'Continue?'
        );

        if (!confirmed) {
          reject(new Error('Import cancelled by user'));
          return;
        }

        // Merge: write each key/value from the backup into localStorage.
        // Keys that exist in localStorage but are absent from the backup
        // are intentionally left alone (merge, not full-replace).
        keysToImport.forEach(key => {
          localStorage.setItem(key, backup.data[key]);
        });

        // Show success message
        alert(`Progress imported successfully! (${keysToImport.length} items)\n\nReloading page...`);
        
        // Reload the page to refresh UI
        setTimeout(() => {
          window.location.reload();
        }, 100);
        
        resolve();
      } catch (error) {
        alert('Failed to import progress: Invalid JSON file');
        reject(error);
      }
    };

    reader.onerror = () => {
      alert('Failed to read file');
      reject(reader.error);
    };

    reader.readAsText(file);
  });
}
