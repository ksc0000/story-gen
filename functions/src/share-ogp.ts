import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { injectOgpIntoShell, isValidBookId } from "./lib/share-ogp-html";

const SHELL_URL = "https://story-gen-8a769.web.app/index.html";
const SHELL_TTL_MS = 5 * 60 * 1000;
const CACHE_CONTROL = "public, max-age=60, s-maxage=300";

let shellCache: { html: string; fetchedAt: number } | null = null;

async function getShellHtml(): Promise<string | null> {
  if (shellCache && Date.now() - shellCache.fetchedAt < SHELL_TTL_MS) {
    return shellCache.html;
  }
  try {
    const res = await fetch(SHELL_URL);
    if (!res.ok) throw new Error(`shell fetch status ${res.status}`);
    const html = await res.text();
    shellCache = { html, fetchedAt: Date.now() };
    return html;
  } catch (err) {
    logger.warn("shareOgp: shell fetch failed", { error: String(err) });
    return shellCache?.html ?? null;
  }
}

/**
 * /share?id=<bookId> のSSR: SPAシェルに絵本のOGPメタを注入して返す (#697)
 * fail-open方針: 何かに失敗したら無加工シェル or リダイレクトで必ず表示は守る。
 */
export const shareOgp = onRequest(
  { region: "asia-northeast1", memory: "256MiB", timeoutSeconds: 10, maxInstances: 5 },
  async (req, res) => {
    const shell = await getShellHtml();
    if (!shell) {
      // シェルすら取れない場合は静的サイトへ逃がす（rewrite除去と同等の挙動）
      res.redirect(302, "https://story-gen-8a769.web.app/");
      return;
    }

    const rawId = req.query.id;
    let title: string | null = null;
    let coverImageUrl: string | null = null;

    if (isValidBookId(rawId)) {
      try {
        const snap = await getFirestore().collection("books").doc(rawId).get();
        const data = snap.data();
        if (snap.exists && data?.public === true) {
          title = typeof data.title === "string" ? data.title : null;
          coverImageUrl = typeof data.coverImageUrl === "string" ? data.coverImageUrl : null;
        }
      } catch (err) {
        logger.warn("shareOgp: firestore read failed", { error: String(err) });
      }
    }

    const shareUrl = `https://ehoria.app/share${isValidBookId(rawId) ? `?id=${rawId}` : ""}`;
    const html = injectOgpIntoShell(shell, { title, coverImageUrl, shareUrl });

    res.set("Cache-Control", CACHE_CONTROL);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  }
);
