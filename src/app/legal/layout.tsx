import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50/40 to-white">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-violet-500 hover:text-purple-700 hover:underline"
        >
          ← Ehoria トップへ
        </Link>
        <article className="legal-prose mt-6">{children}</article>
        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-violet-100 pt-6 text-sm text-violet-500">
          <Link href="/legal/terms" className="hover:text-purple-700 hover:underline">
            利用規約
          </Link>
          <Link href="/legal/privacy" className="hover:text-purple-700 hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/legal/tokushoho" className="hover:text-purple-700 hover:underline">
            特定商取引法に基づく表記
          </Link>
        </footer>
      </div>
    </main>
  );
}
