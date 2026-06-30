"use client";

import { useState } from "react";
import { Settings2, BookmarkPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CREATION_MODE_LABELS, OUTFIT_MODE_LABELS } from "@/lib/plans";
import { saveTemplate } from "@/lib/hooks/use-saved-templates";
import type { BookDoc } from "@/lib/types";

interface Props {
  book: BookDoc & { id: string };
  userId: string;
}

export function BookSettingsPanel({ book, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [name, setName] = useState(book.title ? `${book.title}の設定` : "わたしのテンプレート");
  const [error, setError] = useState<string | null>(null);

  const facts: { label: string; value: string }[] = [
    { label: "作り方", value: book.creationMode ? CREATION_MODE_LABELS[book.creationMode] ?? "" : "" },
    { label: "絵のスタイル", value: book.selectedStyleName ?? "" },
    { label: "ページ数", value: book.pageCount ? `${book.pageCount}ページ` : "" },
    {
      label: "服装",
      value: book.characterUsage?.outfitMode
        ? OUTFIT_MODE_LABELS[book.characterUsage.outfitMode] ?? ""
        : "",
    },
    { label: "なかよしキャラ", value: book.input?.companionName ?? "" },
  ].filter((f) => f.value);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveTemplate(userId, book, name);
      setSaved(true);
      setShowSaveForm(false);
    } catch (err) {
      console.error("Failed to save template:", err);
      setError("保存に失敗しました。時間をおいてお試しください。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-violet-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-violet-600 transition hover:bg-violet-50/50"
      >
        <span className="flex items-center gap-2 font-medium">
          <Settings2 className="size-4 text-violet-400" />
          生成設定を見る
        </span>
        <span className="text-violet-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-violet-50 px-4 py-3">
          <dl className="divide-y divide-violet-50">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-violet-400">{f.label}</dt>
                <dd className="font-medium text-purple-800">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3">
            {saved ? (
              <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-sm font-medium text-emerald-600">
                <Check className="size-4" />
                テンプレートに保存しました
              </p>
            ) : showSaveForm ? (
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="テンプレートの名前"
                  maxLength={40}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}
                    保存する
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-violet-400"
                    onClick={() => setShowSaveForm(false)}
                    disabled={saving}
                  >
                    やめる
                  </Button>
                </div>
                {error && <p className="text-xs text-rose-500">{error}</p>}
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50"
                onClick={() => setShowSaveForm(true)}
              >
                <BookmarkPlus className="size-4" />
                この設定をテンプレートとして保存
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-violet-300">
            保存すると、次に絵本を作るとき同じ設定をすぐ呼び出せます。
          </p>
        </div>
      )}
    </div>
  );
}
