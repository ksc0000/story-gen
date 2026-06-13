"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { MessageSquare, Send, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { functions } from "@/lib/firebase";
import { trackAnalyticsEvent } from "@/lib/analytics";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const submitFeedback = httpsCallable<{ text: string }, { success: boolean }>(
        functions,
        "submitAppFeedback"
      );
      await submitFeedback({ text: text.trim() });

      trackAnalyticsEvent("submit_app_feedback", {
        contentLength: text.trim().length,
      });

      setIsSuccess(true);
      setText("");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      const message = err instanceof Error ? err.message : "送信に失敗しました。もう一度お試しください。";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PageTransition className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-100 bg-emerald-50/30 p-8 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">フィードバックありがとうございます！</h1>
            <p className="mt-3 text-emerald-700 leading-relaxed">
              いただいたご意見は、今後のサービスの改善に役立てさせていただきます。<br />
              よりよい体験をお届けできるよう、チーム一同努めてまいります。
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Link href="/home">
              <Button className="w-full sm:w-auto">本棚に戻る</Button>
            </Link>
            <Button variant="outline" onClick={() => setIsSuccess(false)} className="w-full sm:w-auto">
              追加で送信する
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/home" className="inline-flex items-center text-sm text-violet-500 hover:text-violet-700 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" />
          戻る
        </Link>
      </div>

      <header className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold text-purple-900">
          <MessageSquare className="h-3.5 w-3.5" />
          ご意見をお聞かせください
        </div>
        <h1 className="mt-4 text-3xl font-bold text-purple-950">フィードバック</h1>
        <p className="mt-2 text-violet-600 leading-relaxed">
          アプリを使っていて気づいたこと、欲しい機能、改善してほしい点など、<br className="hidden sm:block" />
          何でもお気軽にお書きください。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例：〇〇の機能が使いやすかったです、もっと××なスタイルの絵が選べると嬉しいです、など"
            className="min-h-[240px] w-full rounded-[24px] border-2 border-violet-100 bg-white/80 p-5 text-base leading-relaxed text-purple-950 placeholder:text-violet-300 focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-400/10 transition-all"
            disabled={isSubmitting}
            maxLength={5000}
            required
          />
          <div className="absolute bottom-4 right-5 text-xs text-violet-300">
            {text.length} / 5000
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-violet-400 leading-relaxed max-w-[60%]">
            ※個別の返信は行っていませんが、すべて大切に拝見しております。
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !text.trim()}
            className="min-w-[140px] rounded-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                送信する
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-12 rounded-2xl border border-dashed border-violet-200 p-6 bg-white/40">
        <h2 className="text-sm font-bold text-purple-900">よくある質問・お問い合わせ</h2>
        <p className="mt-2 text-xs text-violet-500 leading-relaxed">
          不具合の報告や、返信が必要な重要なお問い合わせについては、
          恐れ入りますが公式LINEまたはサポート窓口までご連絡ください。
        </p>
      </div>
    </PageTransition>
  );
}
