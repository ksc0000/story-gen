import type { Metadata } from "next";
import { Inter, Kaisei_Decol, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/**
 * フォント定義
 * ────────────────────────────────────────────────────────────
 * next/font を使うことで:
 *   - 自己ホスト＋プリロード（CLS / レイアウトシフトを抑止）
 *   - Google Fonts への外部リクエスト排除（プライバシー / 速度）
 *   - CSS 変数として公開（ehon-magic 側のトークンから参照）
 * ────────────────────────────────────────────────────────────
 */

// 本文用：日本語の丸ゴシック
const fontBody = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-body",
});

// 見出し / ディスプレイ用：日本語のセリフ系
const fontDisplay = Kaisei_Decol({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-display",
});

// 数字や英字のためのラテンフォント（任意で利用）
const fontLatin = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-latin",
});

export const metadata: Metadata = {
  title: "EhoNAI - AIで絵本を作ろう",
  description:
    "我が子が主人公になれる絵本を、誰でも5分で作れる。AIが紡ぐ物語と挿絵で、世界にひとつだけの思い出を。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      // フォント変数は <html> に当て、子孫すべてから var(--font-*) が参照可能になる。
      // suppressHydrationWarning は今後 data-theme をクライアントで切り替える際の差分警告を抑止。
      className={`${fontBody.variable} ${fontDisplay.variable} ${fontLatin.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ehonai-theme')||'night';document.documentElement.dataset.theme=t;}catch(_){document.documentElement.dataset.theme='night';}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
