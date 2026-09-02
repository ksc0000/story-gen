/**
 * 共有ページOGP注入の純関数群 (#697)
 * SPAシェル(index.html)に絵本ごとのog:/twitter:メタを差し込む。
 * 副作用なし・単体テスト対象。
 */

export interface ShareOgpInput {
  /** 絵本タイトル（非公開・未取得時はnull） */
  title: string | null;
  /** 表紙画像URL（https。無ければnull） */
  coverImageUrl: string | null;
  /** 正規化済みの共有URL */
  shareUrl: string;
}

const SITE_NAME = "Ehoria";
const FALLBACK_TITLE = "Ehoria - AIで絵本を作ろう";
const FALLBACK_DESCRIPTION =
  "世界にひとつだけの絵本を、AIと魔法で。お子さまが主人公になる物語を数分でお届けします。";
const BOOK_DESCRIPTION =
  "Ehoriaでつくった、世界にひとつだけのAI絵本です。ひらいて読んでみてください。";

/** HTML属性/テキスト用エスケープ */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 絵本IDとして許容する形式（Firestore自動ID等） */
export function isValidBookId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{5,40}$/.test(id);
}

/** og:image に使ってよいURLか（https限定・改行等の混入拒否） */
export function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 2048) return false;
  if (/[\s<>"']/.test(url)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** メタタグ一式を生成 */
export function buildOgpTags(input: ShareOgpInput): { pageTitle: string; tags: string } {
  const isBook = input.title != null && input.title.trim().length > 0;
  const pageTitle = isBook ? `${input.title!.trim()} | ${SITE_NAME}` : FALLBACK_TITLE;
  const description = isBook ? BOOK_DESCRIPTION : FALLBACK_DESCRIPTION;
  const image = input.coverImageUrl && isSafeImageUrl(input.coverImageUrl) ? input.coverImageUrl : null;

  const e = escapeHtml;
  const lines = [
    `<meta name="robots" content="noindex">`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${e(pageTitle)}">`,
    `<meta property="og:description" content="${e(description)}">`,
    `<meta property="og:url" content="${e(input.shareUrl)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${e(pageTitle)}">`,
    `<meta name="twitter:description" content="${e(description)}">`,
    `<meta name="description" content="${e(description)}">`,
  ];
  if (image) {
    lines.push(`<meta property="og:image" content="${e(image)}">`);
    lines.push(`<meta name="twitter:image" content="${e(image)}">`);
  }
  return { pageTitle, tags: lines.join("\n") };
}

/**
 * SPAシェルへメタを注入。
 * - 既存の<title>を差し替え
 * - 既存のdescription/og:/twitter:メタを除去（重複防止）
 * - </head>直前にタグ一式を挿入
 * シェルの形が想定外でも壊さない（挿入できなければ原文を返す）。
 */
export function injectOgpIntoShell(shellHtml: string, input: ShareOgpInput): string {
  const { pageTitle, tags } = buildOgpTags(input);
  let html = shellHtml;

  // 置換文字列に $& や $' が含まれると String.replace の特殊パターン扱いになるため、関数形式で挿入する
  const titleTag = `<title>${escapeHtml(pageTitle)}</title>`;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => titleTag);
  html = html.replace(/<meta\s+(?:name="(?:description|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/gi, "");

  if (!/<\/head>/i.test(html)) return shellHtml;
  const injected = `${tags}\n</head>`;
  return html.replace(/<\/head>/i, () => injected);
}
