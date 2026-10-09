import { describe, expect, it } from "vitest";
import { transcriptFromResults } from "./speech-recognition";

describe("speech transcription", () => {
  it("joins simultaneous recognition segments into the visible text", () => {
    const results = [
      { 0: { transcript: "Paciente com febre" } },
      { 0: { transcript: "e dispneia" } },
    ];
    expect(transcriptFromResults(results)).toBe("Paciente com febre e dispneia");
  });
});