/**
 * useSpeechRecognition.ts
 *
 * Thin wrapper around the browser Web Speech API (SpeechRecognition /
 * webkitSpeechRecognition).  Designed to be prototype-friendly:
 *
 *  - One recognition attempt per call to `startListening()`.
 *  - Language defaults to "zh-CN" for Chinese character results on
 *    Chromium-based browsers and iOS Safari.
 *  - Exposes raw `transcript` so callers can inspect what the browser
 *    actually returned during development.
 *  - All state transitions are explicit and predictable.
 *
 * Browser support notes:
 *  - Chrome / Edge (desktop + Android): full support, returns hanzi.
 *  - iOS Safari 14.5+: supported via webkitSpeechRecognition, returns hanzi.
 *  - Firefox: NOT supported → `isSupported` will be false.
 *
 * Usage:
 *   const { isSupported, listening, transcript, startListening, stopListening } =
 *     useSpeechRecognition({ lang: "zh-CN", onResult, onError });
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Minimal Web Speech API type declarations ─────────────────────────────────
//
// The project's tsconfig targets ES2022 + DOM but the Speech Recognition types
// are only present in newer lib.dom.d.ts versions.  We declare just what we
// need here so there are no external @types dependencies.

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart:     ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult:    ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror:     ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend:       ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type SpeechStatus =
  | "idle"        // not yet started
  | "listening"   // microphone is open, waiting for speech
  | "processing"  // got audio, waiting for transcript
  | "done"        // transcript received (success path)
  | "error"       // recognition failed or was aborted
  | "unsupported"; // browser does not support the API

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag.  Default: "zh-CN" */
  lang?: string;
  /** Called with the best transcript when recognition succeeds. */
  onResult: (transcript: string) => void;
  /** Called with an error message when recognition fails. */
  onError?: (message: string) => void;
}

export interface UseSpeechRecognitionReturn {
  /** False when the browser has no SpeechRecognition API. */
  isSupported: boolean;
  /** Current recognition lifecycle state. */
  status: SpeechStatus;
  /** Convenience: true while the mic is open. */
  listening: boolean;
  /**
   * The last raw transcript string returned by the browser.
   * Useful during development to verify what the API returns.
   */
  transcript: string;
  /** Start a single recognition attempt.  No-op if already listening. */
  startListening: () => void;
  /** Abort any in-progress recognition. */
  stopListening: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeechRecognition({
  lang = "zh-CN",
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  // Check support once at hook initialisation time.
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null;

  const isSupported = SpeechRecognitionCtor !== null;

  const [status, setStatus] = useState<SpeechStatus>(
    isSupported ? "idle" : "unsupported"
  );
  const [transcript, setTranscript] = useState("");

  // Keep a stable ref to the active recognition instance so we can abort it.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Keep stable refs for callbacks so the recognition event handlers don't
  // capture stale closures.
  const onResultRef = useRef(onResult);
  const onErrorRef  = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setStatus((prev) => (prev === "listening" || prev === "processing" ? "idle" : prev));
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionCtor) {
      setStatus("unsupported");
      return;
    }
    if (status === "listening" || status === "processing") return;

    // Abort any leftover instance before starting a new one.
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onspeechend = () => {
      setStatus("processing");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Pick the best (highest-confidence) alternative.
      const result = event.results[0];
      let best = result[0].transcript;
      let bestConf = result[0].confidence;
      for (let i = 1; i < result.length; i++) {
        if (result[i].confidence > bestConf) {
          best = result[i].transcript;
          bestConf = result[i].confidence;
        }
      }

      // Debug log — remove or gate on a DEV flag once you're happy.
      console.debug(
        "[SayChinese] raw transcript:", best,
        "| confidence:", bestConf,
        "| all alts:", Array.from({ length: result.length }, (_, i) => result[i].transcript)
      );

      setTranscript(best);
      setStatus("done");
      recognitionRef.current = null;
      onResultRef.current(best);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.error;
      console.warn("[SayChinese] recognition error:", msg);
      setStatus("error");
      recognitionRef.current = null;
      onErrorRef.current?.(msg);
    };

    recognition.onend = () => {
      // onend fires after onresult AND after onerror.
      // Only flip back to idle if we haven't already transitioned to done/error.
      setStatus((prev) => {
        if (prev === "listening" || prev === "processing") return "idle";
        return prev;
      });
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.warn("[SayChinese] recognition.start() threw:", err);
      setStatus("error");
      recognitionRef.current = null;
    }
  }, [isSupported, SpeechRecognitionCtor, lang, status]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    status,
    listening: status === "listening",
    transcript,
    startListening,
    stopListening,
  };
}
