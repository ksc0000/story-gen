/**
 * テンプレート入力項目のラベルと、不足時のメッセージ生成。
 * 「必要な情報を入力してください」だけでは、どの欄が足りないか分からず
 * （入力欄の枠線が見えない不具合と重なって）ユーザーが止まってしまったため、項目名を名指しする。
 */
export const TEMPLATE_FIELD_LABELS: Record<string, string> = {
  place: "どこでの思い出？",
  familyMembers: "だれと一緒だった？",
  parentMessage: "伝えたいメッセージ",
  lessonToTeach: "教えたいこと",
  memoryToRecreate: "再現したい思い出",
  storyRequest: "おはなしのリクエスト",
};

export function formatMissingFieldsMessage(missing: string[]): string {
  if (missing.length === 0) return "";
  const names = missing.map((f) => `「${TEMPLATE_FIELD_LABELS[f] ?? f}」`).join("と");
  return `${names}を入力してください`;
}
