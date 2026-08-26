"use client";

import { useState, useEffect, useCallback } from "react";

export function useVisualViewport() {
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      const isCoarse = window.matchMedia("(pointer: coarse)").matches;
      const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
      setIsMobile(isCoarse || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const vv = window.visualViewport;
    if (!vv) {
      return () => {
        window.removeEventListener("resize", checkMobile);
      };
    }

    const handleViewportChange = () => {
      const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKeyboardOffset(offset);
    };

    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  const scrollInputIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  return {
    isMobile,
    shouldAutoFocus: !isMobile,
    keyboardOffset,
    scrollInputIntoView,
  };
}
