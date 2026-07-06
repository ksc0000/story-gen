# 登場人物解決（Protagonist / Cast Resolution）設計

> 目的: 「誰が主人公で、誰が絵に登場するか」を**単一の真実の源**から導出し、
> 画像プロンプトに矛盾（例: 相棒が主人公なのに "the child" が混入）が
> **構造的に生成できない**ようにする。加えて、その不変条件をテストで固定する。

## 背景（なぜ必要か）

相棒（非人間）を主人公にした固定テンプレ絵本（book `M9l6x9qYgJEdohjSy7o8`「ピノのてぶくろ」）で、
ストーリー文は「ピノ」に置換されているのに**画像には人間の子が登場**した。
原因は、主人公の同一性が複数箇所で**別々に・矛盾して**表現されていたこと:

- 固定テンプレの生シーン文（`the child` をハードコード）
- `buildCharacterConsistencyRules` / `buildCharacterConsistencyGuidance`（`same child` をハードコード）
- 参照画像分離句 `FIXED_IMAGE_PROMPT_REF_ISOLATION_SUFFIX`（"use the reference image ONLY for **the child character's face**"）

そこへ後付けの「人間の子を描くな」ガード（`protagonistIsNonHuman` の counterrule）が
戦いを挑むが、具体的で繰り返される生シーン文に**負ける**。結果、ページごとに
「子どものみ / ピノのみ / 両方」とバラつく。counter-instruction を足す設計は再発する。

## 登場人物パターン（洗い出し）

### 主人公の種別（protagonist kind）
| # | 種別 | 由来 | 参照画像 | 状態 |
|---|---|---|---|---|
| P1 | 登録児（human_child） | children プロフィール | approvedImageUrl（水彩アバター） | 既存・良好 |
| P2 | 相棒（non_human_companion） | companions | companion illustration | **今回破綻** |
| P3 | 写真ベースの子（photo_story） | アップロード写真 | 元写真（style_reference） | 既存 |
| P4 | 人型の相棒（characterKind=human_child の companion） | 将来 | — | 未対応・要検討 |

### 同時に登場しうる脇役
- 相棒（buddy として、子主人公と併存）
- 動物（テンプレ既定: ねずみ・うさぎ・きつね 等）
- 家族（兄弟・親・祖父母, #571）
- 友だち（別の human_child）
- 特殊キャラ（star 等、専用ガードあり）
- 物・背景キャラ（object_character / background）

### characterKind（型・types.ts）
`human_child` / `human_adult` / `animal` / `magical_creature` / `object_character` / `background`

### 作成モード
- `fixed_template`: 画像プロンプト固定（"child" 焼き込み）＝**穴の温床**
- `guided_ai` / `original_ai`: Gemini が cast を見て都度生成＝比較的整合（ただし drift はあり得る）

組合せ空間 = 主人公種別 × 脇役構成 × 作成モード。総当たり手当ては非現実的。

## 設計: ProtagonistDescriptor（単一の真実の源）

book データから主人公を1つの型付き記述子へ解決する `resolveProtagonist(bookData, story)` を新設。
以後、主人公に触れる全プロンプト片は**この descriptor だけ**から導出する。

```ts
type ProtagonistKind = "human_child" | "non_human_companion";

interface ProtagonistDescriptor {
  kind: ProtagonistKind;
  displayName: string;                 // "ピノ" / childName
  /** プロンプトで主人公を指す語。全片がこれを使う */
  noun: string;                        // human: "the child" / companion: "ピノ (a light blue monster ...)"
  /** 主人公自身の同一性ルール（kind から導出） */
  consistencyClause: string;
  /** 参照画像の使い方（kind から導出） */
  referenceClause: string;
  /** このシーンに人間の子が登場してよいか */
  allowsHumanChildInScene: boolean;    // human_child 主人公=true, 相棒主人公=false（脇役に human_child cast がいれば別途許可）
}
```

- `noun`/`consistencyClause`/`referenceClause` を **kind 分岐で1回だけ**生成し、
  `buildCharacterConsistencyRules`・`buildCharacterConsistencyGuidance`・参照画像指示・固定シーン中和が
  すべてこれを参照する。
- 相棒主人公では `referenceClause` に「子どもの顔として使え」を**出さない**
  （参照画像はピノなので矛盾していた）。

## 修正タッチポイント（Phase 1）

| 箇所 | 現状 | 変更 |
|---|---|---|
| `buildCharacterConsistencyRules` (prompt-builder) | "same child" 固定 | descriptor.consistencyClause 駆動（noun 差し替え） |
| `buildCharacterConsistencyGuidance` (prompt-builder) | "same child" 固定 | 同上 |
| 固定テンプレ生シーン文（seed 焼き込み） | "a kind child" / REF_ISOLATION の child 句 | **生成時中和**: 相棒主人公のとき child 句を noun へ置換／身体記述除去 |
| `buildFixedCharacterBible` (generate-book) | "child-friendly hero" | descriptor 由来へ |
| counter-guard（`protagonistIsNonHuman`） | 矛盾を殴る | 源が一貫するので**簡素化/削除**（保険で1行だけ残すのは可） |

> 固定テンプレの child 句は Firestore の template に焼き込み済みのため、
> seed 定数の変更だけでは既存テンプレに効かない。**生成時中和**が正しい層。

## 不変条件（テストで固定＝class of bug を封じる）

主人公種別ごとに、最終プロンプト（cover/page）に対して assert:

1. **相棒主人公**: プロンプトに
   - `the child ... (face|hairstyle|outfit)` を含まない
   - `same child` / `the same child on every page` を含まない
   - 主人公 noun（ピノ）と非人間宣言を含む
2. **子主人公**: 従来どおり child 一貫性句を含む（回帰保護）
3. **矛盾 lint**: 「no human child」と「the child's face」が同一プロンプトに同居しない

これにより、将来テンプレ追加や誰かの "child" ハードコードで矛盾が生じたら
**テストが落ちて出荷前に検知**できる。

## 段階計画

- **Phase 1（本 doc の実装）**: resolveProtagonist 導入＋上記タッチポイント descriptor 化＋
  相棒主人公の不変条件テスト。今回の class を封鎖。functions のみ・1ブランチ。
- **Phase 2（後日）**: 脇役（家族・友だち・複数 human_child）まで cast 解決を拡張、
  不変条件テストを (kind × mode × cast) 代表組合せに拡大。P4（人型相棒）対応判断。

## 非目標（今回やらない）

- 生成パイプライン全体のリライト（子主人公の一貫性は良好で、回帰リスクが割に合わない）
- Gemini 生成モード（guided/original）のプロンプト構造の大改変（fixed_template ほど焼き込みが無い）
