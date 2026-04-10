/**
 * useSpeechRecognition.ts
 *
 * Wrapper around the browser Web Speech API with:
 *  - Full lifecycle event logging (onstart, onaudiostart, onsoundstart,
 *    onspeechstart, onspeechend, onnomatch, onresult, onerror, onend)
 *  - Safety timeout: if recognition starts but no result arrives within
 *    SAFETY_TIMEOUT_MS, recognition is stopped gracefully and onError is
 *    called with "no-speech-timeout"
 *  - "End without result" detection: if onend fires without onresult ever
 *    firing (common on iOS Safari), onError is called with "end-without-result"
 *  - Exported eventLog[] for on-screen debugging on any device
 *
 * Error codes surfaced via onError:
 *   "no-speech"          – browser detected no speech (standard)
 *   "end-without-result" – onend fired before onresult (iOS Safari quirk)
 *   "no-speech-timeout"  – safety timer expired before any result
 *   "aborted"            – user cancelled (stopListening)
 *   <anything else>      – native browser error string
 *
 * Browser support:
 *  - Chrome / Edge (desktop + Android): full support, returns hanzi
 *  - iOS Safari 14.5+: webkitSpeechRecognition, returns hanzi, quirky lifecycle
 *  - Firefox: NOT supported → isSupported = false
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Safari/iOS detection ─────────────────────────────────────────────────────
// Used to apply iOS-specific workarounds (explicit .stop() on onspeechend).
const IS_IOS =
  typeof navigator !== "undefined" &&
  /iP(hone|od|ad)/.test(navigator.userAgent);

// Safety timeout: if no result arrives within this window, stop and report.
const SAFETY_TIMEOUT_MS = 7000;

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
  onstart:      ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechstart:((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend:  ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onnomatch:    ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult:     ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror:      ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend:        ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
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
  /** Called with an error code string when recognition fails. */
  onError?: (message: string) => void;
}

export interface UseSpeechRecognitionReturn {
  /** False when the browser has no SpeechRecognition API. */
  isSupported: boolean;
  /** Current recognition lifecycle state. */
  status: SpeechStatus;
  /** Convenience: true while the mic is open. */
  listening: boolean;
  /** The last raw transcript string returned by the browser. */
  transcript: string;
  /**
   * Timestamped log of every lifecycle event fired since the last
   * startListening() call.  Useful for on-screen debugging on iOS
   * where DevTools is unavailable.
   */
  eventLog: string[];
  /** Clear the event log (e.g. on new round). */
  clearEventLog: () => void;
  /** Start a single recognition attempt.  No-op if already listening. */
  startListening: () => void;
  /** Abort any in-progress recognition (user cancel). */
  stopListening: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeechRecognition({
  lang = "zh-CN",
  onResult,
  onError,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  // Detect constructor once at initialisation time.
  const SpeechRecognitionCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
      : null;

  const isSupported = SpeechRecognitionCtor !== null;

  const [status, setStatus] = useState<SpeechStatus>(
    isSupported ? "idle" : "unsupported"
  );
  const [transcript, setTranscript] = useState("");
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Active recognition instance.
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Safety timeout: fires if no result arrives within SAFETY_TIMEOUT_MS.
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-attempt boolean flags (reset in startListening):
  //   gotResult       – onresult fired
  //   reportedError   – onerror already called onError
  //   wasAborted      – stopListening() was called (user cancel)
  //   timedOut        – safety timer expired
  const gotResultRef    = useRef(false);
  const reportedErrRef  = useRef(false);
  const wasAbortedRef   = useRef(false);
  const timedOutRef     = useRef(false);

  // Stable refs for callbacks so event handlers never capture stale closures.
  const onResultRef = useRef(onResult);
  const onErrorRef  = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current  = onError;  }, [onError]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const appendLog = useCallback((msg: string) => {
    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const entry = `${ts} ${msg}`;
    console.log(`[SayChinese] ${entry}`);
    setEventLog((prev) => [...prev.slice(-19), entry]); // keep last 20
  }, []);

  const clearEventLog = useCallback(() => setEventLog([]), []);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  // ── stopListening (user-initiated cancel) ──────────────────────────────

  const stopListening = useCallback(() => {
    clearSafetyTimer();
    wasAbortedRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setStatus((prev) =>
      prev === "listening" || prev === "processing" ? "idle" : prev
    );
  }, [clearSafetyTimer]);

  // ── startListening ─────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionCtor) {
      setStatus("unsupported");
      return;
    }
    if (status === "listening" || status === "processing") return;

    // Abort any leftover instance.
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    // Reset per-attempt flags.
    gotResultRef.current   = false;
    reportedErrRef.current = false;
    wasAbortedRef.current  = false;
    timedOutRef.current    = false;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang           = lang;
    recognition.continuous     = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1; // 1 is safest on iOS Safari

    // ── Lifecycle events (logged + status transitions) ─────────────────

    recognition.onstart = () => {
      appendLog("onstart — mic open");
      setStatus("listening");

      // Start safety timer: if nothing arrives, stop gracefully.
      safetyTimerRef.current = setTimeout(() => {
        safetyTimerRef.current = null;
        appendLog(`safety timeout (${SAFETY_TIMEOUT_MS}ms) — calling stop()`);
        timedOutRef.current = true;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop(); // graceful; onend will fire
          } catch {
            // stop() threw — fall back to abort and report directly
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            setStatus("error");
            onErrorRef.current?.("no-speech-timeout");
          }
        }
      }, SAFETY_TIMEOUT_MS);
    };

    recognition.onaudiostart = () => {
      appendLog("onaudiostart — audio stream started");
    };

    recognition.onsoundstart = () => {
      appendLog("onsoundstart — sound detected");
    };

    recognition.onspeechstart = () => {
      appendLog("onspeechstart — speech detected");
    };

    recognition.onspeechend = () => {
      appendLog("onspeechend — speech ended");
      setStatus("processing");
      // iOS Safari quirk: explicitly call stop() when speech ends to ensure
      // the result is processed and onresult / onend fire reliably.
      if (IS_IOS && recognitionRef.current) {
        appendLog("iOS: calling stop() after onspeechend");
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };

    recognition.onnomatch = () => {
      appendLog("onnomatch — no match found");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearSafetyTimer();
      gotResultRef.current = true;

      const result = event.results[0];
      const best = result[0].transcript;
      const conf = result[0].confidence;

      appendLog(`onresult — "${best}" (conf: ${conf.toFixed ? conf.toFixed(2) : conf})`);

      setTranscript(best);
      setStatus("done");
      recognitionRef.current = null;
      onResultRef.current(best);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clearSafetyTimer();
      reportedErrRef.current = true;
      const msg = event.error ?? "unknown";
      appendLog(`onerror — "${msg}"`);
      setStatus("error");
      recognitionRef.current = null;
      onErrorRef.current?.(msg);
    };

    recognition.onend = () => {
      clearSafetyTimer();
      appendLog(
        `onend — gotResult:${gotResultRef.current} aborted:${wasAbortedRef.current} ` +
        `reportedErr:${reportedErrRef.current} timedOut:${timedOutRef.current}`
      );

      // Surface "end without result" only when none of the other paths
      // already handled the outcome.
      if (
        !gotResultRef.current &&
        !reportedErrRef.current &&
        !wasAbortedRef.current
      ) {
        const code = timedOutRef.current
          ? "no-speech-timeout"
          : "end-without-result";
        appendLog(`onend: surfacing error "${code}"`);
        setStatus("error");
        recognitionRef.current = null;
        onErrorRef.current?.(code);
        return;
      }

      // Normal end after result or aborted — just flip back to idle if needed.
      setStatus((prev) =>
        prev === "listening" || prev === "processing" ? "idle" : prev
      );
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      appendLog(`start() — lang:${lang} iOS:${IS_IOS}`);
      recognition.start();
    } catch (err) {
      clearSafetyTimer();
      appendLog(`start() threw: ${String(err)}`);
      setStatus("error");
      recognitionRef.current = null;
      onErrorRef.current?.("start-failed");
    }
  }, [isSupported, SpeechRecognitionCtor, lang, status, appendLog, clearSafetyTimer]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearSafetyTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [clearSafetyTimer]);

  return {
    isSupported,
    status,
    listening: status === "listening",
    transcript,
    eventLog,
    clearEventLog,
    startListening,
    stopListening,
  };
}
