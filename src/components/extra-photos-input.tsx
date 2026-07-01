"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";

interface ExtraPhotosInputProps {
  /** 既存の追加写真URL（保持中）。 */
  keptUrls: string[];
  /** 新規に選んだファイル。 */
  newFiles: File[];
  max?: number;
  onChange: (next: { keptUrls: string[]; newFiles: File[] }) => void;
}

/**
 * 追加の参考写真（似せ精度アップ）。既存URLと新規ファイルを混在で管理し、
 * 合計 max 枚まで。各サムネイルは個別に削除できる。
 */
export function ExtraPhotosInput({ keptUrls, newFiles, max = 2, onChange }: ExtraPhotosInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // 新規ファイルのプレビューURLを生成/破棄。
  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  const total = keptUrls.length + newFiles.length;
  const canAdd = total < max;

  const items = useMemo(
    () => [
      ...keptUrls.map((url, i) => ({ kind: "url" as const, src: url, index: i })),
      ...newFiles.map((_, i) => ({ kind: "file" as const, src: previews[i], index: i })),
    ],
    [keptUrls, newFiles, previews]
  );

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = Math.max(0, max - total);
    onChange({ keptUrls, newFiles: [...newFiles, ...files.slice(0, room)] });
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeUrl = (i: number) =>
    onChange({ keptUrls: keptUrls.filter((_, idx) => idx !== i), newFiles });
  const removeFile = (i: number) =>
    onChange({ keptUrls, newFiles: newFiles.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div
            key={`${item.kind}-${item.index}`}
            className="relative h-20 w-20 overflow-hidden rounded-2xl border border-violet-200"
          >
            {item.src ? (
              <Image src={item.src} alt="参考写真" fill className="object-cover" unoptimized />
            ) : null}
            <button
              type="button"
              onClick={() => (item.kind === "url" ? removeUrl(item.index) : removeFile(item.index))}
              className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white shadow-sm hover:bg-red-600"
              aria-label="削除"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {canAdd ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 text-violet-400 hover:bg-violet-100"
          >
            <Camera size={22} />
            <span className="mt-1 text-[10px]">追加</span>
          </button>
        ) : null}
      </div>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleAdd}
      />
    </div>
  );
}
