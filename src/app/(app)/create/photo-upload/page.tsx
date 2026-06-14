"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";
import { BackButton } from "@/components/back-button";
import { useAuth } from "@/lib/hooks/use-auth";
import { db, storage } from "@/lib/firebase";
import { PLAN_CONFIGS } from "@/lib/plans";
import { trackAnalyticsEvent } from "@/lib/analytics";

function PhotoUploadPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初回表示時にモーダルを出す、またはアップロードボタン押下時に出すためのステート
  // 今回は「アップロードに進む前に」という要件なので、ファイル選択時か、ページ表示時に出す。
  // 要件「同意しないとアップロードに進めない」ので、ボタン押下時に同意チェックする。

  const handleAgree = () => {
    setHasConsented(true);
    setShowConsentModal(false);
    fileInputRef.current?.click();
  };

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Consent check
    if (!hasConsented) {
      setShowConsentModal(true);
      return;
    }

    const newFiles = [...selectedFiles, ...files].slice(0, 5);
    setSelectedFiles(newFiles);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return newPreviews;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleCreate = async () => {
    if (!user || selectedFiles.length < 3) return;
    setCreating(true);
    setError(null);

    try {
      const bookId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const sourcePhotoUrls: string[] = [];

      // 1. Upload photos to Storage
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const extension = file.name.split(".").pop();
        const storagePath = `users/${user.uid}/books/${bookId}/sourcePhotos/${i}.${extension}`;
        const storageRef = ref(storage, storagePath);

        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        sourcePhotoUrls.push(url);
      }

      // 2. Create Book document in Firestore
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
      const createdAtMs = Date.now();
      const planConfig = PLAN_CONFIGS.premium_paid;

      const bookPayload = {
        userId: user.uid,
        title: "作成中...",
        theme: "photo_story",
        creationMode: "photo_story",
        sourcePhotos: sourcePhotoUrls,
        productPlan: planConfig.productPlan,
        imageQualityTier: planConfig.imageQualityTier,
        imageModelProfile: planConfig.imageModelProfile,
        characterConsistencyMode: planConfig.characterConsistencyMode,
        style: "soft_watercolor", // Default style for photo story if not selected
        pageCount: 8, // Default page count
        status: "generating",
        progress: 0,
        input: {
          childName: "主人公", // Placeholder
        },
        createdAt: serverTimestamp(),
        createdAtMs,
        createdAtSource: "client_photo_story",
        updatedAt: serverTimestamp(),
        updatedAtMs: createdAtMs,
        expiresAt,
      };

      const bookRef = await addDoc(collection(db, "books"), bookPayload);

      trackAnalyticsEvent("start_book_generation", {
        productPlan: planConfig.productPlan,
        creationMode: "photo_story",
        photoCount: selectedFiles.length,
      });

      router.push(`/generating?id=${bookRef.id}`);
    } catch (err) {
      console.error("Failed to create photo story book:", err);
      setError("絵本の作成に失敗しました。通信状況を確認してもう一度お試しください。");
      setCreating(false);
    }
  };

  return (
    <PageTransition className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <BackButton className="mb-3" />
      <StepIndicator currentStep={2} />
      <h1 className="mt-6 text-center text-xl font-bold text-purple-900">写真をアップロード</h1>
      <p className="mt-2 text-center text-sm text-violet-500">
        思い出の写真を3〜5枚選んでください。
      </p>

      {/* ヒントセクション */}
      <div className="mt-6 space-y-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-purple-900">✨ 絵本になりやすい写真のコツ</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "主役の顔がはっきり見える",
              "明るい場所で撮影している",
              "写っている人数は1〜3人まで",
              "ブレていない、ピントが合っている",
              "シーンが伝わる（誕生日、公園など）",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 text-xs text-emerald-600">
                <span className="shrink-0">✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            {[
              "逆光・暗い写真",
              "顔が小さくて見えない集合写真",
              "背景が複雑で主役が分かりにくい",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2 text-xs text-rose-500">
                <span className="shrink-0">×</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 期待値調整コピー */}
      <div className="mt-4 rounded-2xl bg-purple-50 p-4 text-xs leading-relaxed text-purple-700">
        <p className="font-bold">💡 AIがあなたの写真の「瞬間」をもとに、絵本の世界に描き直します。</p>
        <p className="mt-1 opacity-80">写真の忠実なコピーではなく、絵本ならではの温かいタッチでお届けします。</p>
      </div>

      {/* 写真アップロード・プレビュー領域 */}
      <div className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((url, index) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-purple-100 bg-violet-50 shadow-sm">
              <Image
                src={url}
                alt={`プレビュー ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm transition-all hover:bg-rose-500 hover:text-white"
              >
                <Trash2 size={16} />
              </button>
              <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {index + 1}
              </div>
            </div>
          ))}

          {selectedFiles.length < 5 && (
            <button
              type="button"
              onClick={() => (hasConsented ? fileInputRef.current?.click() : setShowConsentModal(true))}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 text-purple-400 transition-colors hover:border-purple-300 hover:bg-purple-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-bold">写真を追加</span>
            </button>
          )}
        </div>

        {selectedFiles.length > 0 && selectedFiles.length < 3 && (
          <p className="text-center text-xs text-rose-500">あと {3 - selectedFiles.length} 枚追加してください</p>
        )}
        {selectedFiles.length >= 3 && (
          <p className="text-center text-xs text-emerald-600 font-medium">ばっちりです！ {selectedFiles.length}枚選ばれました</p>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>

      {/* 同意モーダル */}
      <AnimatePresence>
        {showConsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowConsentModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertCircle size={24} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-purple-900">アップロードの前に</h3>
                <div className="mt-4 space-y-3 text-left text-xs leading-relaxed text-violet-600">
                  <p>・写真に写っているすべての人の許諾を得てください</p>
                  <p>・アップロードされた写真はAIによる絵本生成のみに使用し、第三者への提供・広告利用は行いません</p>
                  <p>・生成された絵本のイラストは写真そのものではなく、AIが絵本風に再解釈したものです</p>
                </div>
                <div className="mt-6 flex w-full flex-col gap-2">
                  <Button className="w-full" onClick={handleAgree}>
                    同意してアップロード
                  </Button>
                  <Button variant="ghost" className="w-full text-violet-400" onClick={() => setShowConsentModal(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-purple-100 bg-white/95 backdrop-blur-sm px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3">
        <div className="mx-auto max-w-lg">
          <Button
            size="lg"
            className="w-full"
            disabled={selectedFiles.length < 3 || creating}
            onClick={handleCreate}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              "この写真で絵本を作る！"
            )}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}

export default function PhotoUploadPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-violet-400">読み込み中...</div>}>
      <PhotoUploadPageContent />
    </Suspense>
  );
}
