"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type NavLink = { href: string; label: string; accent?: boolean };

const NAV_LINKS: NavLink[] = [
  { href: "/bookshelf", label: "本棚" },
  { href: "/gallery", label: "ギャラリー" },
  { href: "/children", label: "子ども" },
  { href: "/companions", label: "なかよしキャラ" },
  { href: "/how-to-use", label: "使い方ガイド" },
  { href: "/pricing", label: "プラン", accent: true },
  { href: "/feedback", label: "ご意見" },
];

export function AppNav({
  userName,
  onSignOut,
}: {
  userName?: string | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target (document.body) is only available after mount on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      {/* Desktop: inline links (sm and up) */}
      <nav className="hidden items-center gap-5 sm:flex">
        {NAV_LINKS.slice(0, 4).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-semibold transition ${
              link.accent
                ? "text-amber-600 hover:text-amber-700"
                : "text-violet-500 hover:text-purple-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Settings/Menu button (always visible) */}
      <button
        type="button"
        aria-label="メニューを開く"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/60 bg-white/60 text-violet-600 backdrop-blur transition hover:bg-white/80"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Menu sheet — rendered via portal to <body> so it escapes the
          app-header's `backdrop-filter`, which would otherwise act as the
          containing block for position:fixed and clip the overlay to the
          header height. */}
      {mounted && open
        ? createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Panel — opaque so the page behind never shows through */}
          <div
            style={{ backgroundColor: "#ffffff" }}
            className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-1 overflow-y-auto p-4 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-violet-600">メニュー</span>
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-violet-500 hover:bg-violet-100/60"
              >
                <X size={18} />
              </button>
            </div>

            {userName ? (
              <p className="mb-1 truncate px-3 text-xs text-violet-400">{userName}</p>
            ) : null}

            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-3 text-base font-semibold transition ${
                  pathname.startsWith(link.href)
                    ? "bg-violet-100/70 text-purple-700"
                    : link.accent
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-violet-600 hover:bg-violet-50"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-violet-100" />

            <div className="px-3 py-2">
              <p className="mb-2 text-xs font-semibold text-violet-400">テーマ</p>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="mt-auto flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-rose-500 transition hover:bg-rose-50"
            >
              <LogOut size={18} /> ログアウト
            </button>
          </div>
        </div>,
            document.body
          )
        : null}
    </>
  );
}
