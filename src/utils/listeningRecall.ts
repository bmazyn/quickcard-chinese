import listeningRecallData from "../data/listening-recall.json";

export interface ListeningRecallCard {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
}

export interface ListeningRecallGroup {
  group: number;
  cards: ListeningRecallCard[];
}

export const listeningRecallGroups = listeningRecallData as ListeningRecallGroup[];

export function getSortedListeningRecallGroups(): ListeningRecallGroup[] {
  return [...listeningRecallGroups].sort((a, b) => a.group - b.group);
}

const STORAGE_KEY = "quickcard-listening-recall-progress";
const MAX_COMPLETED_ROUNDS = 8;

export interface ListeningRecallProgress {
  completedRounds: number;
}

type ListeningRecallProgressMap = Record<string, ListeningRecallProgress>;

function readProgressMap(): ListeningRecallProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as ListeningRecallProgressMap;
    }
    return {};
  } catch (error) {
    console.error("[listeningRecall] Failed to read progress from localStorage:", error);
    return {};
  }
}

function writeProgressMap(map: ListeningRecallProgressMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error("[listeningRecall] Failed to write progress to localStorage:", error);
  }
}

export function getGroupProgress(groupId: number | string): ListeningRecallProgress {
  const map = readProgressMap();
  const key = String(groupId);
  return map[key] ?? { completedRounds: 0 };
}

export function setGroupProgress(
  groupId: number | string,
  progress: Partial<ListeningRecallProgress>
): ListeningRecallProgress {
  const map = readProgressMap();
  const key = String(groupId);
  const current = map[key] ?? { completedRounds: 0 };
  const merged: ListeningRecallProgress = {
    completedRounds: Math.max(
      0,
      Math.min(MAX_COMPLETED_ROUNDS, progress.completedRounds ?? current.completedRounds)
    ),
  };
  map[key] = merged;
  writeProgressMap(map);
  return merged;
}

export function incrementCompletedRounds(groupId: number | string): ListeningRecallProgress {
  const current = getGroupProgress(groupId);
  return setGroupProgress(groupId, {
    completedRounds: Math.min(MAX_COMPLETED_ROUNDS, current.completedRounds + 1),
  });
}

export { MAX_COMPLETED_ROUNDS };
