/**
 * ユーザー向けエラーメッセージ マッピングユーティリティ
 * 内部エラーコードやプロバイダー名（Gemini, Replicate, Firestore等）の露出を防ぎ、
 * 上品で分かりやすい日本語メッセージに変換します。
 */

export interface MappedUserError {
  message: string;
  title?: string;
  suggestedAction?: "retry" | "check_input" | "go_home" | "go_pricing";
}

/**
 * 生のエラーオブジェクトまたは文字列からユーザー表示用のメッセージを取得
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = "一時的なエラーが発生しました。少し時間をおいて再度お試しください。"
): string {
  return getUserFriendlyError(error, fallbackMessage).message;
}

/**
 * 生のエラーオブジェクトから、ユーザーメッセージとおすすめのアクション種別を取得
 */
export function getUserFriendlyError(
  error: unknown,
  fallbackMessage = "一時的なエラーが発生しました。少し時間をおいて再度お試しください。"
): MappedUserError {
  if (!error) {
    return {
      message: fallbackMessage,
      suggestedAction: "retry",
    };
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : typeof (error as { message?: string })?.message === "string"
      ? (error as { message?: string }).message!
      : "";

  const rawCode =
    typeof (error as { code?: string })?.code === "string"
      ? (error as { code?: string }).code!
      : "";

  const combined = `${rawCode} ${rawMessage}`.toLowerCase();

  // 1. ネットワーク / 通信エラー
  if (
    combined.includes("failed to fetch") ||
    combined.includes("networkerror") ||
    combined.includes("network_error") ||
    combined.includes("offline") ||
    combined.includes("network request failed")
  ) {
    return {
      message: "通信環境をご確認のうえ、再度お試しください。",
      suggestedAction: "retry",
    };
  }

  // 2. 権限・認証エラー
  if (
    combined.includes("permission-denied") ||
    combined.includes("permission_denied") ||
    combined.includes("insufficient permissions")
  ) {
    return {
      message: "操作に必要な権限が確認できませんでした。お手数ですが本棚へお戻りください。",
      suggestedAction: "go_home",
    };
  }

  if (combined.includes("unauthenticated") || combined.includes("not logged in")) {
    return {
      message: "ログインの有効期限が切れています。再度ログインしてお試しください。",
      suggestedAction: "go_home",
    };
  }

  // 3. 利用上限・クォータエラー
  if (
    combined.includes("resource-exhausted") ||
    combined.includes("quota") ||
    combined.includes("limit_exceeded") ||
    combined.includes("limit reached")
  ) {
    return {
      message: "今月の作成上限に達しました。プランをご確認ください。",
      suggestedAction: "go_pricing",
    };
  }

  // 4. タイムアウト・サーバー混雑
  if (
    combined.includes("unavailable") ||
    combined.includes("deadline-exceeded") ||
    combined.includes("timeout") ||
    combined.includes("server_error")
  ) {
    return {
      message: "サーバーが混み合っているため、応答に時間がかかっています。少し時間をおいて再度お試しください。",
      suggestedAction: "retry",
    };
  }

  // 5. データ非存在
  if (combined.includes("not-found") || combined.includes("not_found")) {
    return {
      message: "対象のデータが見つかりませんでした。本棚からご確認いただけます。",
      suggestedAction: "go_home",
    };
  }

  // 6. クリップボード関連
  if (combined.includes("clipboard") || combined.includes("notallowederror")) {
    return {
      message: "クリップボードへのアクセスが許可されていません。ブラウザの設定をご確認ください。",
      suggestedAction: "check_input",
    };
  }

  // 7. 内部キーワード（Gemini, Replicate, Firestore, APIキー等）が含まれる場合は秘匿化
  const internalKeywords = [
    "replicate",
    "gemini",
    "firebase",
    "firestore",
    "cloud function",
    "httpserror",
    "internal",
    "500",
    "502",
    "503",
    "504",
    "api_key",
    "secret",
    "token",
    "prediction",
    "black-forest-labs",
    "flux",
    "openai",
    "google",
    "stack",
    "node_modules",
  ];

  const hasInternalKeyword = internalKeywords.some((keyword) => combined.includes(keyword));

  if (hasInternalKeyword || !rawMessage) {
    return {
      message: fallbackMessage,
      suggestedAction: "retry",
    };
  }

  // 日本語の適切なユーザー向けメッセージであればそのまま採用
  const containsJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawMessage);
  if (containsJapanese) {
    return {
      message: rawMessage,
      suggestedAction: "check_input",
    };
  }

  return {
    message: fallbackMessage,
    suggestedAction: "retry",
  };
}
