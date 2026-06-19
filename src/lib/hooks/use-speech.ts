"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setSupported(true);
    }
  }, []);

  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current || !text) return;

    cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = (event) => {
      // "interrupted" is common when calling cancel(), don't log as error
      if (event.error !== "interrupted") {
        console.error("SpeechSynthesisUtterance error", event);
      }
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  }, [cancel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    speak,
    cancel,
    isSpeaking,
    supported,
  };
}
