"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const Ctx = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? DEFAULT_THEME;
    setThemeState(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
    document.documentElement.dataset.theme = t;
  };

  const toggle = () => {
    const order: Theme[] = ["pastel", "night", "starry"];
    const next = order[(order.indexOf(theme) + 1) % order.length] ?? DEFAULT_THEME;
    setTheme(next);
  };

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
