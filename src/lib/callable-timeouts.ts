/**
 * 長時間 callable のクライアント側タイムアウト。
 * firebase/functions の既定は 70 秒。サーバは regenerate* が 540 秒、generateBookPdf が 300 秒まで
 * 動くため、既定のままだと「クライアントは失敗表示、サーバは後で成功」になり、
 * ユーザーが再試行して二重に生成（課金）する恐れがあった。サーバ上限 + 余裕で設定する。
 */
export const REGENERATE_TIMEOUT_MS = 570_000;
export const PDF_TIMEOUT_MS = 330_000;
