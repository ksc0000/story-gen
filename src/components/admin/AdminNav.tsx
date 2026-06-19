"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, ImageIcon, Wand2, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/book-quality-review", label: "品質レビュー", icon: ClipboardCheck },
  { href: "/admin/image-model-tests", label: "画像モデル", icon: ImageIcon },
  { href: "/admin/template-generator", label: "テンプレ生成", icon: Wand2 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5">
        <Link
          href="/admin/dashboard"
          className="mr-2 flex shrink-0 items-center gap-1.5 font-bold text-purple-900"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-purple-600 text-xs text-white">A</span>
          <span className="hidden sm:inline">Ehoria 管理</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-purple-600 text-white"
                    : "text-violet-500 hover:bg-violet-50 hover:text-purple-700"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/home"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-violet-400 hover:bg-violet-50 hover:text-purple-700"
        >
          <Home className="size-4" />
          <span className="hidden lg:inline">アプリへ戻る</span>
        </Link>
      </div>
    </header>
  );
}
