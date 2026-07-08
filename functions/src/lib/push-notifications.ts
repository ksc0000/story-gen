import * as logger from "firebase-functions/logger";
import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";

const PUBLIC_SITE_URL = "https://ehoria.app";

type FinalBookStatus = "completed" | "partial_completed" | "failed";

interface PushContent {
  title: string;
  body: string;
  link: string;
}

export function buildBookPushContent(
  status: FinalBookStatus,
  bookId: string,
  bookTitle: string | undefined
): PushContent {
  const titleLabel = bookTitle ? `『${bookTitle}』` : "絵本";
  switch (status) {
    case "completed":
      return {
        title: "📖 絵本ができました！",
        body: `${titleLabel}が完成しました。タップして読んでみましょう。`,
        link: `${PUBLIC_SITE_URL}/book/?id=${bookId}`,
      };
    case "partial_completed":
      return {
        title: "📖 絵本ができました",
        body: `${titleLabel}が完成しました（一部のページは後から作り直せます）。`,
        link: `${PUBLIC_SITE_URL}/book/?id=${bookId}`,
      };
    case "failed":
      return {
        title: "絵本の生成がうまくいきませんでした",
        body: "お手数ですが、もう一度お試しください。",
        link: `${PUBLIC_SITE_URL}/generating/?id=${bookId}`,
      };
  }
}

/**
 * 絵本生成の最終ステータス確定時に、所有ユーザーの全端末へプッシュ通知を送る。
 * - トークンは users/{uid}/fcmTokens/{token}（クライアントが保存）
 * - 無効トークン（unregistered 等）は送信結果に基づいて自動削除
 * - 通知は補助機能のため、失敗しても生成フローには影響させない（呼び出し側で catch）
 */
export async function sendBookCompletionPush(params: {
  db: Firestore;
  messaging: Messaging;
  bookId: string;
  status: FinalBookStatus;
}): Promise<void> {
  const { db, messaging, bookId, status } = params;

  const bookSnap = await db.collection("books").doc(bookId).get();
  if (!bookSnap.exists) return;
  const book = bookSnap.data() as { userId?: string; title?: string };
  if (!book.userId) return;

  const tokensSnap = await db
    .collection("users")
    .doc(book.userId)
    .collection("fcmTokens")
    .get();
  const tokens = tokensSnap.docs.map((d) => d.id);
  if (tokens.length === 0) {
    // 観測性: 「通知が来ない」調査時に、送信スキップ（トークン未登録）と
    // 送信失敗を区別できるようにする。
    logger.info("book_completion_push_skipped_no_tokens", { bookId, status });
    return;
  }

  const content = buildBookPushContent(status, bookId, book.title);

  // data メッセージで送る（表示は SW 側の onBackgroundMessage / onMessage が担当）。
  // notification フィールド併用だとブラウザ既定表示と二重になるため data のみ。
  const response = await messaging.sendEachForMulticast({
    tokens,
    data: {
      title: content.title,
      body: content.body,
      link: content.link,
      bookId,
      tag: `book-${bookId}`,
    },
    webpush: {
      headers: { Urgency: "high", TTL: "86400" },
      fcmOptions: { link: content.link },
    },
  });

  // 無効トークンの掃除
  const staleDeletes: Promise<unknown>[] = [];
  response.responses.forEach((res, i) => {
    if (res.success) return;
    const code = res.error?.code ?? "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      staleDeletes.push(
        db.collection("users").doc(book.userId!).collection("fcmTokens").doc(tokens[i]).delete()
      );
    }
  });
  await Promise.all(staleDeletes);

  logger.info("book_completion_push_sent", {
    bookId,
    status,
    tokenCount: tokens.length,
    successCount: response.successCount,
    failureCount: response.failureCount,
    prunedTokens: staleDeletes.length,
  });
}
