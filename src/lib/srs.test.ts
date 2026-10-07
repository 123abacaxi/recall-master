import { expect, it } from "vitest";
import { calculateQualityScore as score, calculateNextReview as next, INITIAL_SRS } from "./srs";

it("starts with ease 2.5, interval 0 and repetitions 0", () => {
  expect(INITIAL_SRS).toEqual({ easeFactor: 2.5, interval: 0, repetitions: 0 });
});
it("scores a quick unassisted review 5 using 15 seconds per trecho", () => {
  expect(score(0, 10, 150)).toBe(5);
});
it("scores a slightly slower unassisted review 4", () => {
  expect(score(0, 10, 180)).toBe(4);
});
it("scores one or two hints in a large text 3", () => {
  expect(score(1, 10, 150)).toBe(3);
  expect(score(2, 10, 150)).toBe(3);
});
it("scores accuracy below 60 percent 2", () => {
  expect(score(5, 10, 150)).toBe(2);
});
it("scores accuracy below 30 percent 1", () => {
  expect(score(8, 10, 150)).toBe(1);
});
it("never calls five minutes on a short text easy", () => {
  expect(score(0, 2, 300)).toBe(1);
});
it("keeps grades between 0 and 5 and handles empty notes", () => {
  expect(score(10, 10, 1)).toBe(0);
  expect(score(0, 0, 1)).toBe(0);
});
it("resets failed reviews to one day and zero repetitions", () => {
  const result = next(2, 2.5, 15, 3);
  expect(result.interval).toBe(1);
  expect(result.repetitions).toBe(0);
  expect(result.easeFactor).toBeCloseTo(2.18);
});
it("uses 1, 6 and rounded interval times current ease for successes", () => {
  expect(next(5, 2.5, 0, 0).interval).toBe(1);
  expect(next(5, 2.5, 1, 1).interval).toBe(6);
  expect(next(5, 2.5, 6, 2).interval).toBe(15);
  expect(next(5, 2.5, 6, 2).repetitions).toBe(3);
});
it("uses official SM-2 ease formula and floor 1.3", () => {
  expect(next(5, 2.5, 0, 0).easeFactor).toBe(2.6);
  expect(next(0, 1.3, 6, 2).easeFactor).toBe(1.3);
});