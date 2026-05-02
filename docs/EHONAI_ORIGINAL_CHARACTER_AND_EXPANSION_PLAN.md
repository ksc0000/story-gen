# EhonAI オリジナル相棒キャラクター機能・追加準備設計案

作成日: 2026-05-01  
対象リポジトリ: `ksc0000/story-gen`  
想定配置: `docs/EHONAI_ORIGINAL_CHARACTER_AND_EXPANSION_PLAN.md`

---

## 0. このドキュメントの目的

EhonAIにおいて、既存の3つの絵本作成方式に加えて、以下の追加価値を設計する。

- 全くこの世にないオリジナルキャラクターを生成する
- そのキャラクターを主人公または相棒として絵本に登場させる
- 同じキャラクターを複数冊に再利用し、シリーズ化できるようにする
- 将来的に、子どもごとの“専属キャラクターIP”として育てる

既存の3モード:

```text
テンプレート = fixed_template
かんたんカスタム = guided_ai
オリジナル = original_ai
```

この3つに対して、今回の案は単純な4つ目の作成方式ではなく、**主人公タイプ / キャラクター利用機能** として横断的に扱うことを推奨する。

---

# 1. 結論

EhonAIには、**「全くこの世にないキャラクターを生み出して主人公にする機能」** を入れる価値が高い。

ただし、UI設計上は以下のように分けるのが望ましい。

```text
作り方
- テンプレート
- かんたんカスタム
- オリジナル

主人公タイプ
- お子さん本人
- オリジナル相棒
- お子さん + オリジナル相棒
- 家族・ペット参加
```

理由:

- 作り方と主人公タイプを混ぜるとUIが複雑になる
- オリジナル相棒はテンプレートにも、かんたんカスタムにも、オリジナルにも使える
- 一度作った相棒を何度も使うことで、継続利用・シリーズ化・課金導線が作れる

---

# 2. 競合・市場観点からの示唆

AI絵本サービスでは、以下の機能が価値として打ち出されている。

## 2-1. キャラクター一貫性

競合サービスでは、子どもや家族のキャラクターを作成し、全ページで同じ見た目を保つことが重要な価値になっている。

代表例:

- TaleKit: 写真・説明・アーキタイプから子どものキャラクターを作り、物語全体で一貫させる
- TaleIt: consistent characters を主要価値として訴求
- Wonder Wisp: 子どものプロフィールを保存し、すべてのストーリーで見た目を保つ
- ToonyStory: 写真から作ったキャラクターを全ページで一貫させる
- StoryPals: 子ども、兄弟、ペット、想像上の友だちをキャラクター化できる

## 2-2. EhonAIで狙う差別化

多くのAI絵本サービスは、主に以下を訴求している。

```text
子ども本人を主人公にする
写真からキャラクター化する
絵柄を選べる
ジャンルを選べる
PDFや印刷にできる
```

EhonAIでは、ここに以下を追加する。

```text
子どものためだけの「まだ誰も知らない相棒」を作れる
その相棒が、子どもの成長・不安・挑戦・思い出に寄り添う
相棒を保存し、次の絵本にも登場させられる
```

これにより、単発のAI絵本ではなく、**その子だけのキャラクターシリーズ** にできる。

---

# 3. 機能名案

## 3-1. ユーザー向け名称

### 第一候補

```text
ふしぎな相棒をつくる
```

理由:

- 親子向けにやわらかい
- 「キャラクター創造」より分かりやすい
- 子どもにとってワクワクする
- 相棒という言葉に継続性がある

### その他候補

```text
オリジナルキャラクター絵本
まだ誰も知らない主人公をつくる
ぼくだけ・わたしだけの相棒
ものがたりの友だちをつくる
夢のキャラクターをつくる
```

---

# 4. この機能で作れるキャラクター例

```text
夜になると星を集める、ちいさな雲の子
忘れものを探す、青いリュックの妖精
ありがとうを食べて光る、まるいドラゴン
こわい気持ちを小さな泡に変える、透明なくじら
眠れない夜にだけ会える、月色のきつね
勇気の種をポケットに入れている、たんぽぽ色のロボット
泣きそうな気持ちをふわふわ雲に変える、ミルク色のひつじ
```

---

# 5. オリジナル相棒の価値

## 5-1. 子ども本人の写真を使わなくてもパーソナライズできる

写真アップロードに抵抗がある家庭でも使いやすい。

```text
子どもの顔を使わない
でも、その子の好きなもの・性格・課題に寄り添える
```

## 5-2. 継続利用に向く

一度作った相棒を保存すれば、複数の絵本に登場させられる。

```text
第1話: はじめてのほいくえん
第2話: はみがきできたよ
第3話: おやすみの星あつめ
第4話: ありがとうを届けよう
```

## 5-3. 課金価値が高い

相棒キャラの生成・保存・再利用は、無料体験よりも有料機能に向いている。

```text
無料: テンプレート絵本
有料: 相棒キャラ保存
上位有料: 相棒シリーズ化・高画質・PDF出力
```

## 5-4. IP化しやすい

人気キャラが生まれた場合、以下に展開できる。

```text
- 絵本シリーズ
- 印刷絵本
- スタンプ
- ぬりえ
- 壁紙
- グッズ
- 季節イベント絵本
```

---

# 6. UI設計

## 6-1. 基本フロー

```text
1. どんな相棒にしたい？
2. 性格を選ぶ
3. 見た目を選ぶ
4. 特別な力を選ぶ
5. AIがキャラクター案を生成
6. 1つ選ぶ
7. 微修正する
8. 名前をつける
9. キャラクター登録
10. そのキャラで絵本を作る
```

## 6-2. MVP版フロー

初期実装では、以下までで十分。

```text
1. 相棒の役割を選ぶ
2. 性格を3つ選ぶ
3. 見た目の雰囲気を選ぶ
4. メインカラーを選ぶ
5. 特別な力を選ぶ
6. キャラクター画像を1枚生成
7. 名前をつけて保存
```

## 6-3. 画面タイトル案

---

# 7. story cast と recurring character consistency

## 7-1. child protagonist だけでなく、buddy / magical friend / animal / object character にも Character Bible を適用する

EhonAI では、主人公の子どもだけが一貫していれば十分ではない。相棒、魔法の友だち、動物キャラ、ものキャラなど、**同じ存在として再登場するキャラクター全体** に対して一貫性ルールを持たせる。

そのため、1冊の絵本 story JSON に `cast` を持たせ、各キャラに以下を定義する。

- `characterId`
- `displayName`
- `role`
- `visualBible`
- `silhouette`
- `colorPalette`
- `signatureItems`
- `doNotChange`
- `canChangeByScene`
- `approvedImageUrl`
- `referenceImageUrl`

## 7-2. story cast の考え方

`story cast` は、絵本内に出てくる recurring character の設計図である。

- 子ども主人公は既存の `childProfileSnapshot` / `characterBible` で扱える
- 相棒、動物、魔法キャラなどは `cast` に追加する
- `pages[].appearingCharacterIds` で、そのページに出るキャラを明示する
- `pages[].focusCharacterId` で、そのページの主役キャラを示す

これにより、Gemini が毎ページ新しい “magical friend” を作ってしまうのではなく、**同じ `characterId` の同一存在を描く** 方向に寄せられる。

相棒キャラ、ほしのこ、魔法の友だち、動物キャラなど、2ページ以上に出る存在は原則として cast に入れる。

## 7-3. 「同じ存在だがポーズや表情だけ変える」ルール

同じキャラであっても、毎ページ同じポーズ・同じ角度・同じ表情に固定する必要はない。

固定するもの:

- 体型 / シルエット
- 髪型 / 毛並み
- 顔の特徴
- 色の組み合わせ
- 帽子やアクセサリー
- 光り方やオーラ
- 変えてはいけない特徴

変えてよいもの:

- ポーズ
- 表情
- カメラ角度
- 距離感
- 手のしぐさ
- 背景との関係
- シーンに応じた動き

## 7-4. approvedImageUrl / referenceImageUrl を各ページで参照する方針

将来的には、child protagonist だけでなく、story cast に含まれる相棒キャラにも参照画像を持たせる。

- `users/{userId}/children/{childId}` 由来の child reference
- `users/{userId}/originalCharacters/{characterId}` 由来の buddy reference

画像生成時は、ページに登場する `appearingCharacterIds` を見て、必要な `approvedImageUrl` / `referenceImageUrl` を `input_images` に加える。

これにより、premium / `pro_consistent` では **child reference + buddy reference** を同時に渡し、両方の一貫性を高められる。

また、ページ単位では次を保持する。

- `appearingCharacterIds`
- `focusCharacterId`

これにより、「どのページにどの相棒が出ているか」「そのページで誰が主役か」を story と page data の両方から追える。

## 7-5. originalCharacters 保存設計への接続

今回の実装では `originalCharacters` の本格 CRUD までは行わないが、設計上は以下に接続できるようにしておく。

- `users/{userId}/originalCharacters/{characterId}`
- `approvedImageUrl`
- `referenceImageUrl`
- `visualBible`
- `signatureItems`
- `doNotChange`
- `colorPalette`
- `silhouette`

この情報は、その後の複数冊の絵本で再利用し、シリーズ化の土台になる。

```text
ふしぎな相棒をつくろう
```

## 6-4. サブコピー案

```text
お子さんの毎日に寄り添う、世界にひとりだけの相棒を作ります。
寝る前、挑戦の日、思い出の日。
これからの絵本に何度でも登場できます。
```

## 6-5. CTA

```text
相棒をつくる
この子を相棒にする
この相棒で絵本を作る
```

---

# 7. キャラクター作成質問

## Q1. どんな相棒にしたいですか？

### UIラベル

```text
相棒の役割
```

### 選択肢

```text
やさしく見守る相棒
一緒に冒険する相棒
困ったときに助けてくれる相棒
笑わせてくれる相棒
眠る前に安心させてくれる相棒
挑戦する勇気をくれる相棒
```

### 保存フィールド案

```text
role
defaultRoleInStory
```

---

## Q2. 性格を選んでください

### UIラベル

```text
性格
```

### 選択肢

```text
やさしい
元気
おっとり
ちょっとドジ
勇敢
ものしり
甘えんぼ
いたずら好き
聞き上手
照れ屋
前向き
不思議ちゃん
```

### 保存フィールド案

```text
personalityTraits
```

---

## Q3. 見た目の雰囲気を選んでください

### UIラベル

```text
見た目の雰囲気
```

### 選択肢

```text
ふわふわ
まるい
小さい
光る
透明
もこもこ
星っぽい
動物っぽい
ロボットっぽい
雲っぽい
植物っぽい
おもちゃっぽい
```

### 保存フィールド案

```text
visualMood
bodyShape
texture
```

---

## Q4. メインカラーを選んでください

### UIラベル

```text
メインカラー
```

### 選択肢

```text
ミルクホワイト
そらいろ
さくらピンク
レモンイエロー
ミントグリーン
ラベンダー
キャラメル
ほしぞらネイビー
コーラルオレンジ
若葉グリーン
```

### 保存フィールド案

```text
mainColor
accentColor
```

---

## Q5. どんな力を持っていますか？

### UIラベル

```text
特別な力
```

### 選択肢

```text
こわい気持ちを小さくする
忘れものを見つける
星を集める
夢の入口を開く
ありがとうを光に変える
泣きそうな気持ちを雲にする
勇気を一粒くれる
眠くなる魔法の音を鳴らす
小さな成功を見つける
やさしい言葉を花にする
```

### 保存フィールド案

```text
specialPower
```

---

## Q6. 弱点やクセを選んでください

### UIラベル

```text
ちょっとしたクセ
```

### 選択肢

```text
朝が少し苦手
ほめられると光る
うれしいとくるくる回る
びっくりすると小さくなる
おなかがすくと眠くなる
ありがとうを聞くと花を咲かせる
```

### 保存フィールド案

```text
weaknessOrQuirk
```

---

# 8. データ設計案

## 8-1. TypeScript型案

```ts
export type CharacterRole =
  | "hero"
  | "buddy"
  | "guide"
  | "guardian"
  | "comic_relief";

export interface OriginalCharacterDoc {
  userId: string;
  childId?: string | null;

  name: string;
  species: string;
  role: CharacterRole;
  personalityTraits: string[];
  specialPower: string;
  weaknessOrQuirk?: string;

  visualProfile: {
    bodyShape: string;
    mainColor: string;
    accentColor?: string;
    faceFeatures: string;
    outfitOrItem?: string;
    texture?: string;
    sizeFeeling: string;
    characterBible: string;
    approvedImageUrl?: string;
    referenceImageUrl?: string;
    basePrompt: string;
    negativePrompt?: string;
    version: number;
  };

  storyUsage: {
    suitableThemes: string[];
    avoidThemes: string[];
    defaultRoleInStory: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
  active: boolean;
}
```

---

## 8-2. BookDocへの追加案

```ts
export type ProtagonistType =
  | "child"
  | "original_character"
  | "child_with_original_character"
  | "family_or_pet";

export interface BookDoc {
  protagonistType?: ProtagonistType;
  originalCharacterId?: string | null;
  originalCharacterSnapshot?: OriginalCharacterSnapshot;
}
```

---

## 8-3. OriginalCharacterSnapshot案

```ts
export interface OriginalCharacterSnapshot {
  name: string;
  species: string;
  role: CharacterRole;
  personalityTraits: string[];
  specialPower: string;
  weaknessOrQuirk?: string;
  visualProfile: {
    characterBible: string;
    approvedImageUrl?: string;
    basePrompt: string;
    mainColor: string;
    accentColor?: string;
  };
}
```

---

# 9. Firestore構造案

MVPでは `users/{userId}/originalCharacters/{characterId}` を推奨。

```text
users/{userId}
  children/{childId}
  originalCharacters/{characterId}
```

現在実装に合わせた Firestore パス前提:

```text
users/{userId}/children/{childId}
users/{userId}/originalCharacters/{characterId}
books/{bookId}
books/{bookId}/pages/{pageId}
```

理由:

- ユーザー所有のキャラクターとして扱いやすい
- Firestore Rulesが書きやすい
- 子どもプロフィールと紐づけやすい
- 他ユーザーからの参照制御がしやすい

---

# 10. キャラクター生成プロンプト

## 10-1. 画像生成用プロンプト

```text
Create an original child-friendly storybook character.

Character concept:
- Name: {characterName}
- Species/type: {species}
- Personality: {personalityTraits}
- Special power: {specialPower}
- Main color: {mainColor}
- Accent color: {accentColor}
- Visual mood: {visualMood}
- Signature item: {signatureItem}

Style requirements:
- soft children’s picture book illustration
- warm, friendly, non-scary
- simple recognizable silhouette
- expressive face
- suitable for ages 1-8
- full body character design
- clean background
- character sheet style
- consistent design details

Avoid:
- scary monster
- sharp teeth
- horror
- realistic animal aggression
- weapons
- overly complex details
- copyrighted character resemblance
```

---

## 10-2. キャラクターBible生成プロンプト

```text
あなたは子ども向け絵本のキャラクターデザイナーです。
以下の情報をもとに、絵本で何度も使えるオリジナルキャラクターの characterBible を作ってください。

目的:
- 毎回の画像生成で見た目がぶれないようにする
- 子ども向けに安心できるキャラクターにする
- 既存の有名キャラクターに似せない
- シンプルで覚えやすいシルエットにする

出力項目:
1. キャラクター名
2. 種族・存在の説明
3. 性格
4. 特別な力
5. 弱点・クセ
6. 見た目の詳細
7. 必ず入れる特徴
8. 避ける特徴
9. 絵柄の方向性
10. 物語での役割
```

---

## 10-3. ストーリー生成時に混ぜるプロンプト

```text
この絵本には、以下のオリジナル相棒キャラクターを登場させてください。

Character Bible:
{characterBible}

使い方:
- キャラクターの見た目、性格、特別な力を一貫させる
- 子どもの成長や気持ちに寄り添う存在として描く
- 主人公を奪いすぎず、子どもを支える役割にする
- キャラクターの特別な力は、物語のクライマックスで自然に使う
- 既存の有名キャラクターに似せない
```

---

# 11. キャラクター案生成フォーマット

```md
## キャラクター案A: ほしもこ

夜空から落ちてきた、ふわふわの小さな雲の子。
こわい気持ちを小さな星に変える力があります。
少し照れ屋だけど、だれかが不安なときはそっと隣に来てくれます。

- 種類: 星雲の子
- 性格: やさしい、少し照れ屋、聞き上手
- 特別な力: 不安を小さな星に変える
- 弱点: 朝になると少し眠くなる
- 合う絵本: 寝る前、挑戦、不安を乗り越える話
- 見た目: ミルク色の丸い雲、星形の小さな耳、胸に小さな黄色い星
```

---

# 12. サンプルキャラクター案

## 12-1. ほしもこ

```text
夜空から落ちてきた、ふわふわの小さな雲の子。
こわい気持ちを小さな星に変える力があります。
```

- 種類: 星雲の子
- 性格: やさしい、照れ屋、聞き上手
- 特別な力: 不安を小さな星に変える
- 弱点: 朝になると眠くなる
- 合う絵本: 寝る前、不安、挑戦

## 12-2. ありがとうドラゴン

```text
ありがとうの言葉を食べると、胸がぽっと光るまるいドラゴン。
```

- 種類: 小さなドラゴン
- 性格: 元気、素直、少し食いしんぼう
- 特別な力: 感謝の言葉を光に変える
- 弱点: ほめられると照れて飛べなくなる
- 合う絵本: 感謝、家族、祖父母ギフト

## 12-3. つきいろきつね

```text
眠れない夜にだけ会える、月色の小さなきつね。
```

- 種類: 月のきつね
- 性格: 静か、やさしい、ものしり
- 特別な力: 眠る前の不安を月明かりに溶かす
- 弱点: 朝日を見ると透明になる
- 合う絵本: 寝かしつけ、夜の不安

## 12-4. わすれものリュック

```text
忘れものを見つけるのが得意な、青いリュックの妖精。
```

- 種類: リュックの妖精
- 性格: まじめ、ちょっとドジ、世話好き
- 特別な力: 大事なものの場所を感じ取る
- 弱点: 自分のチャックを閉め忘れる
- 合う絵本: 登園、準備、生活習慣

## 12-5. たんぽぽロボ

```text
勇気の種をポケットに入れている、たんぽぽ色の小さなロボット。
```

- 種類: 花のロボット
- 性格: 前向き、少し不器用、応援上手
- 特別な力: 小さな勇気を一粒くれる
- 弱点: 水をあげすぎると眠くなる
- 合う絵本: 挑戦、自己肯定感、初めての体験

---

# 13. 既存3モードとの接続

## 13-1. テンプレート × オリジナル相棒

例:

```text
はみがきできたよ with ほしもこ
```

使い方:

- 固定テンプレートに相棒キャラを登場させる
- 画像プロンプトに characterBible を混ぜる
- 文章には相棒が1〜2ページだけ登場する程度にする

向いている用途:

```text
無料体験後の有料アップセル
低コストなキャラ再利用
生活習慣テンプレート
```

---

## 13-2. かんたんカスタム × オリジナル相棒

例:

```text
寝る前に安心する話 with 月色のきつね
```

使い方:

- 親の目的に合わせて、相棒が自然にサポートする
- 相棒の特別な力をクライマックスに使う
- 主人公は子ども、相棒は支援役

向いている用途:

```text
主力導線
月額課金
継続生成
```

---

## 13-3. オリジナル × オリジナル相棒

例:

```text
誕生日ギフト絵本 with ありがとうドラゴン
```

使い方:

- 親の自由入力にキャラクターを深く絡める
- 記念日・ギフト・思い出に向いた高付加価値絵本にする
- 表紙・本文・ラストメッセージまで一貫させる

向いている用途:

```text
高単価
印刷
PDF
ギフト
```

---

# 14. 主人公タイプ設計

## 14-1. ProtagonistType案

| 主人公タイプ | 内部ID | 説明 |
|---|---|---|
| お子さん本人 | `child` | 子どもがそのまま主役 |
| オリジナル相棒 | `original_character` | 架空キャラが主役 |
| お子さん + 相棒 | `child_with_original_character` | 子どもと相棒の物語 |
| 家族・ペット参加 | `family_or_pet` | 家族やペットも登場 |

## 14-2. UIコピー

```text
だれを主人公にしますか？
```

選択肢:

```text
お子さん本人
お子さんと相棒
相棒キャラクター
家族やペットも登場
```

---

# 15. 追加で必要な準備

## 15-1. キャラクター一貫性チェック

必要データ:

```text
- characterBible
- basePrompt
- approvedImageUrl
- referenceImageUrl
- negativePrompt
- version
- consistencyMode
```

今後は子ども主人公と同様に、オリジナル相棒キャラクターにも以下の consistency rules を共通適用できる形に寄せる。

```text
- same character identity across all pages
- keep age/species impression consistent
- keep hairstyle / silhouette / face logic / body proportions consistent
- keep outfit or signature item when appropriate
- if shown from behind or far away, preserve silhouette and signature cues
```

また、将来的には `approvedImageUrl` / `referenceImageUrl` を全ページ参照する `all_pages` 運用を、子ども主人公とオリジナル相棒の両方で検証できるようにする。

必要なUI:

```text
この見た目で保存する
もう一度作る
少しだけ直す
```

---

## 15-2. 表紙生成

表紙は絵本サービスの満足度に直結する。

必要データ:

```text
- title
- subtitle
- coverImageUrl
- coverPrompt
- authorName
- childName
- originalCharacterId
```

表紙CTA:

```text
表紙を作る
別の表紙にする
この表紙で保存
```

---

## 15-3. プレビュー機能

課金前・保存前に見せたいもの:

```text
- 表紙
- 1ページ目
- あらすじ
- キャラクター画像
- 登場キャラクター一覧
```

---

## 15-4. 音声読み聞かせ

MVPでは不要だが、後の差別化要素として有効。

将来機能:

```text
- 読み聞かせ音声
- 親の声録音
- BGM
- ページめくり音
- 寝かしつけモード
```

---

## 15-5. 子どもプロフィール

相棒キャラクターと接続するために重要。

保存項目:

```text
- 名前
- 年齢
- 好きなもの
- 苦手なもの
- 性格
- 最近できたこと
- 今応援したいこと
- 見た目プロフィール
- 使ってよい表現
- 避けたい表現
```

---

## 15-6. 親の目的タグ

ジャンルよりも、親の目的を軸にする。

```text
- 寝かしつけたい
- 自信を持たせたい
- 思い出を残したい
- 生活習慣を応援したい
- ありがとうを伝えたい
- 祖父母に贈りたい
- 好きなものを伸ばしたい
- 不安をやわらげたい
- 新しい環境を応援したい
```

---

## 15-7. セーフティ設計

子ども向けサービスとして、最初から必要。

禁止・回避:

```text
- 怖すぎる描写
- 暴力
- 差別
- 性的表現
- 子どもを否定する表現
- 病気や発達特性の決めつけ
- 親のしつけを過度に正当化する表現
- 既存の有名キャラクターに似せる表現
```

特に避ける入力例:

```text
アンパンマンみたいにして
ピカチュウ風で
ディズニーっぽく
ジブリ風で
マリオみたいなキャラ
```

代替案:

```text
丸くてやさしい雰囲気
黄色くて元気な小さな相棒
昔話のような温かい絵本調
手描き風のやわらかいファンタジー
```

---

# 16. 課金設計案

## 16-1. 機能別課金

| 機能 | 無料 | 有料 |
|---|---:|---:|
| テンプレート絵本 | ○ | ○ |
| かんたんカスタム | △ | ○ |
| オリジナル絵本 | × | ○ |
| 相棒キャラ生成 | △ 1体まで | ○ |
| 相棒キャラ保存 | × | ○ |
| 相棒シリーズ化 | × | ○ |
| 高画質画像 | × | ○ |
| PDF出力 | × | ○ |
| 印刷用データ | × | ○ |

## 16-2. おすすめプラン接続

```text
Free:
- テンプレート
- 4ページ
- キャラ保存なし

Light:
- テンプレート
- かんたんカスタム
- 4〜8ページ
- 相棒おためし

Standard:
- かんたんカスタム
- オリジナル
- 相棒キャラ保存
- 8〜12ページ

Premium:
- 相棒シリーズ
- 高画質
- PDF
- 印刷向け
- 全ページ一貫性強化
```

---

# 17. 実装ロードマップ

## Phase 1: 既存3モードを整える

```text
- テンプレート10本
- かんたんカスタム質問セット
- オリジナル入力補助
- Firestore seed整理
```

## Phase 2: 子どもプロフィール

```text
- 名前
- 年齢
- 好きなもの
- 性格
- 見た目プロフィール
- デフォルト絵柄
- 生成履歴
```

## Phase 3: オリジナル相棒キャラ

```text
- キャラ作成質問
- キャラクター画像生成
- characterBible保存
- 次回以降の絵本に再利用
```

## Phase 4: シリーズ化

```text
- 同じ相棒で複数冊生成
- はみがき編
- 寝る前編
- 冒険編
- ありがとう編
- 成長記録として蓄積
```

## Phase 5: 高付加価値化

```text
- PDF出力
- 印刷用データ
- 読み聞かせ音声
- 祖父母共有
- ギフト用表紙
- 課金プラン連携
```

---

# 18. Claude Code向け実装プロンプト

## 18-1. データ型追加

```text
story-gen リポジトリに、オリジナル相棒キャラクター機能のための型定義を追加してください。

目的:
- ユーザーが作成した架空キャラクターを保存できるようにする
- 子どもプロフィールと紐づけられるようにする
- 絵本生成時に originalCharacterSnapshot として固定できるようにする

実装内容:
1. src/lib/types.ts と functions/src/lib/types.ts に以下を追加
   - CharacterRole
   - ProtagonistType
   - OriginalCharacterDoc / OriginalCharacterData
   - OriginalCharacterSnapshot
2. BookDoc / BookData に以下を追加
   - protagonistType?: ProtagonistType
   - originalCharacterId?: string | null
   - originalCharacterSnapshot?: OriginalCharacterSnapshot
3. 既存の型と矛盾しないようにする
4. TypeScriptのビルドエラーを解消する
```

---

## 18-2. キャラクター作成UI

```text
オリジナル相棒キャラクター作成画面を追加してください。

目的:
- 親が簡単な質問に答えるだけで、子ども向けの架空キャラクターを作れるようにする

画面:
- /characters/new

UI要件:
1. タイトルは「ふしぎな相棒をつくろう」
2. 以下の質問を表示
   - どんな相棒にしたいですか？
   - 性格を選んでください
   - 見た目の雰囲気を選んでください
   - メインカラーを選んでください
   - どんな力を持っていますか？
   - ちょっとしたクセを選んでください
3. 選択肢はカードまたはチップUIにする
4. 最後に「相棒をつくる」ボタンを表示
5. 入力値からキャラクター生成リクエストを作る
6. 生成後、キャラクター案を表示して保存できるようにする
```

---

## 18-3. キャラクター保存

```text
オリジナル相棒キャラクターをFirestoreに保存する処理を追加してください。

保存先:
users/{userId}/originalCharacters/{characterId}

保存内容:
- name
- species
- role
- personalityTraits
- specialPower
- weaknessOrQuirk
- visualProfile
- storyUsage
- createdAt
- updatedAt
- active

要件:
1. ログインユーザーのみ作成可能
2. 自分のキャラクターのみ読み書き可能
3. childId がある場合は子どもプロフィールに紐づける
4. 保存後は /characters または /create/theme に遷移できるようにする
```

---

## 18-4. 絵本生成との接続

```text
絵本生成時にオリジナル相棒キャラクターを選択できるようにしてください。

目的:
- テンプレート、かんたんカスタム、オリジナルの各モードで、保存済み相棒キャラクターを登場させられるようにする

実装内容:
1. create/theme または create/input で protagonistType を選択できるようにする
2. protagonistType は以下に対応
   - child
   - original_character
   - child_with_original_character
   - family_or_pet
3. original_character または child_with_original_character の場合、保存済みキャラクター一覧を表示
4. 選択されたキャラクターを BookDoc / BookData に snapshot として保存
5. generateStory の systemPrompt に characterBible を混ぜる
6. imagePrompt にも characterBible を反映する
7. キャラクターの見た目が全ページでなるべく一貫するようにする
```

---

# 19. 推奨コミットメッセージ

## 型定義追加

```bash
git commit -m "feat: add original character data model"
```

## UI追加

```bash
git commit -m "feat: add original character creation flow"
```

## 絵本生成接続

```bash
git commit -m "feat: support original characters in story generation"
```

## ドキュメント追加

```bash
git commit -m "docs: add original character expansion plan"
```

---

# 20. 最終まとめ

EhonAIで目指すべき方向性は、単なるAI絵本生成ではなく、以下である。

```text
その子だけの物語
その子だけの相棒
その子だけのシリーズ
```

既存3モードは以下。

```text
テンプレート = 入口
かんたんカスタム = 主力
オリジナル = 高付加価値
```

ここにオリジナル相棒キャラクター機能を横断的に追加する。

```text
オリジナル相棒 = 継続利用・差別化・課金価値
```

最終的には、以下のようなシリーズ体験を作る。

```text
「ゆいちゃんとほしもこ」シリーズ

第1話: はじめてのほいくえん
第2話: はみがきできたよ
第3話: おやすみの星あつめ
第4話: ありがとうを届けよう
```

これは単発のAI絵本ではなく、**子どもごとの小さなIPを育てるサービス** である。
