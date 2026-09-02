/**
 * AI系作成モード用の組み込み既定テンプレート。
 *
 * 背景: #631 以降、guided_ai / original_ai / photo_story の作成導線は「テーマ（テンプレート）」を
 * 選ばずに ai-brief / photo-upload へ進むため、books ドキュメントの theme が空文字で届く。
 * 生成関数が空IDで templates を引くと firebase-admin が
 * `Value for argument "documentPath" is not a valid resource path` を投げ、絵本が必ず失敗していた。
 * テンプレートは fixed_template 以外では「システムプロンプトの土台」と「カテゴリ」程度にしか
 * 使われないので、Firestore に無くても成立する既定値をここで持つ。
 */
import type { CreationMode, TemplateData } from "./types";

/** テンプレート（テーマ）を選ばなくても生成できる作成モード */
const TEMPLATE_FREE_MODES: ReadonlySet<CreationMode> = new Set<CreationMode>([
  "guided_ai",
  "original_ai",
  "photo_story",
]);

export type TemplateFreeCreationMode = Exclude<CreationMode, "fixed_template">;

export function isTemplateFreeCreationMode(mode: unknown): mode is TemplateFreeCreationMode {
  return typeof mode === "string" && TEMPLATE_FREE_MODES.has(mode as CreationMode);
}

/** 既定テンプレートを使った絵本に記録する templateId（クライアントの分析イベントと揃える） */
export const DEFAULT_AI_TEMPLATE_ID = "ai_custom";

const COMMON_RULES = `- 読み聞かせで心地よい、やさしく温かい言葉づかいにしてください。
- 主人公が自分で考え、動き、少し成長する姿を描いてください。
- 怖い展開や悲しい結末ではなく、安心感と小さな驚きを中心にしてください。`;

const SYSTEM_PROMPTS: Record<TemplateFreeCreationMode, string> = {
  guided_ai: `あなたは子ども向け絵本の作家です。保護者が答えたアンケート（主人公、テーマ、雰囲気、場所、伝えたいこと、追加リクエスト）に忠実に、世界にひとつだけのオリジナルストーリーを作ってください。
- 「承認済みのあらすじ」が与えられている場合は、その起承転結を尊重して物語を組み立ててください。
${COMMON_RULES}`,
  original_ai: `あなたは子ども向け絵本の作家です。保護者からの自由なリクエストを最優先に、そこに書かれた登場人物・出来事・伝えたいことを活かしたオリジナルストーリーを作ってください。
- リクエストに無い要素を勝手に主役にしないでください。
${COMMON_RULES}`,
  photo_story: `あなたは子ども向け絵本の作家です。保護者から預かった写真の思い出（場所、出来事、いっしょにいた人やもの）をもとに、その日をふり返るあたたかい物語を作ってください。
- 写真に写っている出来事の順番と雰囲気を大切にし、事実を大きく変えないでください。
${COMMON_RULES}`,
};

const DISPLAY: Record<TemplateFreeCreationMode, { name: string; description: string; icon: string }> = {
  guided_ai: { name: "AIにおまかせ", description: "アンケートをもとにAIがオリジナルの物語を作ります", icon: "✨" },
  original_ai: { name: "じぶんでリクエスト", description: "自由なリクエストからAIが物語を作ります", icon: "📝" },
  photo_story: { name: "写真から作る", description: "写真の思い出をAIが絵本に描き直します", icon: "📸" },
};

export function buildDefaultAiTemplate(
  mode: TemplateFreeCreationMode,
  options: { categoryGroupId?: string } = {}
): TemplateData {
  const display = DISPLAY[mode];
  return {
    name: display.name,
    description: display.description,
    icon: display.icon,
    creationMode: mode,
    categoryGroupId: options.categoryGroupId || "favorite-worlds",
    parentIntent: "子どもの好きなことを物語にして、いっしょに楽しんでほしい",
    priceTier: "take",
    storyCostLevel: "standard",
    systemPrompt: SYSTEM_PROMPTS[mode],
    order: 9999,
    active: true,
  };
}
