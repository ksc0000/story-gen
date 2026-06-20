/**
 * ElevenLabs Text-to-Speech クライアント
 * ───────────────────────────────────────────────────────────────
 * 絵本本文を自然な人間品質の音声に変換する。
 * 多言語モデル eleven_multilingual_v2 を使用（日本語対応）。
 */

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

/** デフォルトのボイス（環境変数 ELEVENLABS_VOICE_ID で上書き可）。 */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel（multilingual_v2 で日本語可）

export interface SynthesizeOptions {
  apiKey: string;
  text: string;
  voiceId?: string;
  /** 0.0-1.0。低いほど抑揚にばらつき、高いほど安定。読み聞かせは 0.4-0.5 推奨。 */
  stability?: number;
  /** 0.0-1.0。声の一貫性。 */
  similarityBoost?: number;
}

/**
 * テキストを音声(mp3)に変換して Buffer で返す。
 */
export async function synthesizeSpeech(options: SynthesizeOptions): Promise<Buffer> {
  const {
    apiKey,
    text,
    voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
    stability = 0.45,
    similarityBoost = 0.75,
  } = options;

  if (!text.trim()) {
    throw new Error("synthesizeSpeech: text is empty");
  }

  const res = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${res.statusText} ${detail.slice(0, 200)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
