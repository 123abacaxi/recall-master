export type SrsState = { easeFactor: number; interval: number; repetitions: number };
export const INITIAL_SRS: SrsState = { easeFactor: 2.5, interval: 0, repetitions: 0 };

/** Deterministic fluency heuristic, not a clinical or AI assessment. */
export function calculateQualityScore(hintsUsed: number, totalTrechos: number, timeTaken: number): number {
  if (!Number.isFinite(totalTrechos) || totalTrechos <= 0) return 0;
  if (!Number.isFinite(hintsUsed) || !Number.isFinite(timeTaken)) return 0;
  const accuracy = Math.max(0, 1 - Math.max(0, hintsUsed) / totalTrechos);
  const idealTime = totalTrechos * 15;
  const penalty = Math.min(1, Math.max(0, timeTaken / idealTime - 1) * 0.1);
  const adjusted = Math.max(0, accuracy - penalty);
  if (adjusted === 0) return 0;
  if (adjusted < 0.3) return 1;
  if (adjusted < 0.6) return 2;
  if (hintsUsed > 0) return 3;
  return penalty > 0 ? (adjusted < 0.9 ? 3 : 4) : 5;
}

export function calculateNextReview(qualityScore: number, currentEase: number, currentInterval: number, currentReps: number): SrsState {
  const quality = Math.max(0, Math.min(5, Math.round(qualityScore)));
  const ease = Math.max(1.3, currentEase);
  const easeFactor = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) return { easeFactor, interval: 1, repetitions: 0 };
  const interval = currentReps === 0 ? 1 : currentReps === 1 ? 6 : Math.max(1, Math.round(currentInterval * ease));
  return { easeFactor, interval, repetitions: currentReps + 1 };
}
/** A reminder is due when it was never reviewed or its scheduled date has passed. */
export function isDue(nextReviewAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!nextReviewAt) return true;
  const t = new Date(nextReviewAt).getTime();
  return Number.isNaN(t) || t <= now.getTime();
}

/** Anki-style daily queue: overdue (oldest first), then never-reviewed cards. */
export function buildDailyQueue<T extends { id: string; nextReviewAt?: string | null }>(items: T[], now: Date = new Date()): T[] {
  const due = items.filter((i) => isDue(i.nextReviewAt, now));
  const scheduled = due.filter((i) => i.nextReviewAt).sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime());
  return [...scheduled, ...due.filter((i) => !i.nextReviewAt)];
}

/** Failed recall (quality < 3) goes back to the end of today's queue, like Anki relearning. */
export function advanceQueue(queue: string[], quality: number): string[] {
  const [current, ...rest] = queue;
  if (current === undefined) return [];
  return quality < 3 ? [...rest, current] : rest;
}
