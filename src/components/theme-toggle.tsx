"use client";
import { useTheme } from "@/components/theme-provider";
import { THEMES, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = {
  pastel: "パステル",
  night: "夜空",
  starry: "星空",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-toggle" role="tablist" aria-label="テーマ切替">
      {THEMES.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={theme === item}
          className={`theme-toggle__button ${theme === item ? "theme-toggle__button--active" : ""}`}
          onClick={() => setTheme(item)}
        >
          {LABELS[item]}
        </button>
      ))}
    </div>
  );
}
