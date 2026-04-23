export type GradeOutcome = "perfect" | "accepted" | "wrong";

export interface GradeResult {
  outcome: GradeOutcome;
  /** The word that had a minor typo, if outcome === "accepted" */
  typoWord?: string;
}

/** Levenshtein edit distance */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/** Max allowed edit distance for a target word */
function allowedDistance(word: string): number {
  const len = word.length;
  if (len <= 4) return 0;
  if (len <= 6) return 1;
  return 2;
}

export function normalizePinyin(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function gradeSentence(
  userInput: string,
  targetPinyin: string,
  acceptedVariants: string[]
): GradeResult {
  const userNorm = normalizePinyin(userInput);
  const allTargets = [targetPinyin, ...acceptedVariants].map(normalizePinyin);

  // Perfect: exact match against any target or variant
  if (allTargets.includes(userNorm)) {
    return { outcome: "perfect" };
  }

  // Token-by-token check against each target
  const userTokens = userNorm.split(" ");

  for (const target of allTargets) {
    const targetTokens = target.split(" ");

    // Word count must match
    if (userTokens.length !== targetTokens.length) continue;

    const typoWords: string[] = [];
    let tooManyErrors = false;

    for (let i = 0; i < targetTokens.length; i++) {
      const tWord = targetTokens[i];
      const uWord = userTokens[i];
      if (tWord === uWord) continue;

      const dist = editDistance(uWord, tWord);
      if (dist <= allowedDistance(tWord)) {
        typoWords.push(tWord); // report the correct word
      } else {
        tooManyErrors = true;
        break;
      }
    }

    if (!tooManyErrors) {
      if (typoWords.length === 1) {
        return { outcome: "accepted", typoWord: typoWords[0] };
      }
      if (typoWords.length === 0) {
        // Shouldn't reach here (would have been caught as perfect), but guard anyway
        return { outcome: "perfect" };
      }
      // Multiple typos → keep checking other targets
    }
  }

  return { outcome: "wrong" };
}
