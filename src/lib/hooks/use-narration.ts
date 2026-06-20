"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ニューラルTTSで生成済みの音声URLを再生するフック。
 * Web Speech とは異なり、サーバー生成済みの自然な人声mp3を HTML5 Audio で再生する。
 */
export function useNarration(onEnded?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Audio 要素を一度だけ生成
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audioRef.current = audio;
    const handleEnded = () => {
      setIsPlaying(false);
      onEndedRef.current?.();
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (audio.src !== url) audio.src = url;
    audio.currentTime = 0;
    void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }, []);

  return { play, stop, isPlaying };
}
