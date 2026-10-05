"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function SimulationSpeechInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string, replace?: boolean) => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }

      if (finalText.trim()) {
        onTranscript(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        toast.error(`Microphone error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    toast.message("Listening… speak your pitch or response.");
  }

  if (!supported) {
    return (
      <p className="text-[13px] text-muted">
        Voice input works in Chrome and Edge. Type your response if mic is unavailable.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => (listening ? stopListening() : startListening())}
        type="button"
      >
        {listening ? <MicOff aria-hidden="true" className="h-4 w-4" /> : <Mic aria-hidden="true" className="h-4 w-4" />}
        {listening ? "Stop mic" : "Use microphone"}
      </button>
      {listening ? (
        <span className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-ink" role="status">
          ● Recording — your words appear in the box below
        </span>
      ) : null}
    </div>
  );
}
