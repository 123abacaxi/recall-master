export type SpeechRecognitionController = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionController;

export function createSpeechRecognition() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

export function transcriptFromResults(results: SpeechRecognitionEventLike["results"]) {
  return Array.from(results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
}