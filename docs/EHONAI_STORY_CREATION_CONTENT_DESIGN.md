# EhonAI 絵本作成モード別コンテンツ設計案

作成日: 2026-05-01  
対象リポジトリ: `ksc0000/story-gen`  
想定配置: `docs/EHONAI_STORY_CREATION_CONTENT_DESIGN.md`

---

## 0. このドキュメントの目的

EhonAIで提供予定の絵本作成方式を、以下の3モードに分けて整理する。

1. テンプレート
2. かんたんカスタム
3. オリジナル

この3つは「ジャンル」ではなく、正確には **絵本の作り方 / Creation Mode** である。

- `fixed_template`: テンプレート
- `guided_ai`: かんたんカスタム
- `original_ai`: オリジナル

ユーザー向けの画面では「ジャンル」よりも **作り方** と表現する方が自然。

---

## 1. 全体コンセプト

### 1-1. ユーザー向けコピー

```text
絵本の作り方を選んでね
```

```text
まずは作り方を選び、そのあと親御さんの目的に合わせてテーマを選べます。
```

### 1-2. 3モードの位置づけ

| 作り方 | 内部ID | 体験価値 | コスト | 自由度 | 主な用途 |
|---|---|---:|---:|---:|---|
| テンプレート | `fixed_template` | すぐ作れる・失敗しにくい | 低 | 低 | MVP、無料体験、ライト利用 |
| かんたんカスタム | `guided_ai` | 質問に答えるだけで“うちの子らしい” | 中 | 中 | 主力導線、一般ユーザー向け |
| オリジナル | `original_ai` | 世界にひとつだけの絵本 | 高 | 高 | ギフト、記念日、有料課金 |

### 1-3. 品質優先の基本方針

- Gemini は **1冊単位** で story JSON を生成する。ページ別に何度も叩く設計ではない。
- 画像生成は **ページ単位** で Replicate を呼ぶため、ページ間の見た目揺らぎは主に画像生成側の問題として扱う。
- 無料体験でも「安いから荒い絵」には寄せず、**短いけれどきれい** を優先する。
- 有料では「長い・自由度が高い・補正や保存性が高い」を価値にする。
- `repeatedPhrase` は本文側で使い、画像には文字として描かせない。
- `visualMotif` は文字ではなく、色・形・小物・自然物として画像に反映する。

---

# 2. テンプレート

## 2-1. 位置づけ

### 目的

低コスト・高速・MVP向き。  
ユーザーが迷わず、すぐに1冊作れる体験を提供する。

### ユーザー心理

- とりあえず試してみたい
- AIに長文を書くのは不安
- 失敗したくない
- 無料で雰囲気を見たい
- まず子どもの名前入り絵本を見てみたい

### モード説明文

```text
はじめての方におすすめ。
用意されたお話に、お子さんの名前や思い出を入れるだけで、すぐに絵本が作れます。
```

### 短い説明

```text
早い・安い・失敗しにくい
```

### CTA

```text
テンプレートで作る
```

### 補足コピー

```text
文章を考えるのが苦手でも大丈夫。
お子さんの名前や場所を入れるだけで、やさしい絵本になります。
```

---

## 2-2. テンプレート共通設計

### 基本ページ数

MVPでは4ページを推奨。

| ページ | 役割 |
|---|---|
| 1ページ目 | 導入・場面設定 |
| 2ページ目 | 発見・体験 |
| 3ページ目 | 感情のピーク |
| 4ページ目 | 親からのメッセージ・余韻 |

### fixed_template の年齢別本文基盤

現在の実装では、固定テンプレートの各ページ本文に以下の2段構えを持てる。

- `textTemplate`: 既定の本文テンプレート
- `textTemplatesByAge`: 年齢帯ごとの本文テンプレート

現在の固定テンプレート生成では、本文選択は次の順で行う。

1. `textTemplatesByAge[readingProfile.ageBand]`
2. `textTemplatesByAge.general_child`
3. `textTemplate`

これにより、既存テンプレートは何も壊さずそのまま動かしつつ、一部テンプレートから段階的に年齢別本文へ移行できる。

対象年齢帯:

- `baby_toddler`
- `preschool_3_4`
- `early_reader_5_6`
- `early_elementary_7_8`
- `general_child`

`general_child` は、年齢未登録時の標準設定や、特定年齢帯の本文が未用意な場合の安全な共通 fallback として使う。

### 年齢別本文量は quality gate でも検査する

現在の guided_ai / original_ai では、年齢別本文量・文数・絵本らしいしかけを **プロンプトで指示するだけでなく、生成後に quality gate で検査** する。

- `storyQualityReport` を `books/{bookId}` に保存する
- 本文が薄すぎる場合、guided_ai / original_ai は **1回だけ再生成** する
- それでも基準を満たさない場合は failed にする
- fixed_template はまず warning / report 収集を優先し、生成自体は継続する
- Gemini の 429 / 5xx / high demand 系障害では retry と fallback model を試し、それでも失敗した場合は「AI が混み合っている」文言で失敗を返す

これにより、3歳以上なのに「1ページ1文・10文字程度」のような薄すぎる結果を減らしやすくする。

### 3歳以上は音遊びだけにしない

3歳以上向けの本文では、擬音やくり返しだけでページを埋めない。

- `baby_toddler` では、音やリズム中心の短い文を許容する
- `preschool_3_4` 以上では、**場所・行動・気持ち・発見** のうち少なくとも 2 つが自然に入る本文を目指す
- 3歳向けでも、意味の通る短い物語文を基本にし、幼稚すぎる造語や説明不足の曖昧な文を避ける
- 擬音は完全禁止ではないが、1ページに 1〜2 個までに抑え、使うたびに少しずつ物語が前に進む形にする

例:

- 悪い例: `ころころ こりころ。まきまき まきば。...`
  理由: 意味が通りにくく、情景や行動が不足している
- 良い例: `すなばの すみに、あかい スコップが ちょこんと ありました。...`
  理由: 場所、行動、発見があり、絵本として読み進めやすい

### premium は本文 rewrite pass を使う

`premium_paid` と `original_ai` では、Gemini で story JSON を生成したあとに **本文だけを磨き直す rewrite pass** を使う。

流れ:

1. 1冊分の story JSON を生成する
2. story quality gate で本文の薄さや不自然さを検査する
3. premium / original では、または本文品質が低いときに、`pages[].text` だけを書き直す rewrite pass を実行する
4. `imagePrompt` / `pageVisualRole` / `narrativeDevice` / `cast` は維持し、本文だけを改善する
5. 再度 quality gate を通し、必要なら通常の再生成フローへ進む

この段階分離により、「絵の設計」と「読み聞かせ本文の自然さ」を同時に改善しやすくする。

### 本文品質の評価は文字数だけで決めない

本文品質は、単純な文字数・文数だけでなく、以下の観点でも評価する。

- 意味が自然に通るか
- 場所の情報があるか
- 子どもの行動や感情があるか
- 小さな発見や変化があるか
- 擬音や造語に寄りすぎていないか

この評価結果は `storyQualityReport` に保存し、将来のテンプレ改善やモデル比較に使う。

### 絵本らしいしかけの設計

guided_ai / original_ai では、物語と絵の両方に以下の要素を入れやすくする。

- `repeatedPhrase`: 覚えやすい短い反復フレーズ
- `visualMotif`: 複数ページで見つかる小物・色・しるし
- `setup`: 序盤に置く小さな伏線
- `payoff`: 最後に回収する余韻
- `hiddenDetails`: 背景にある探し要素

これらは `GeneratedStory.narrativeDevice` に保持し、本文と imagePrompt の両方に活用する。

### storyGoal / mainQuestObject を固定する

guided_ai / original_ai では、絵本1冊ごとに次の目的フィールドを持たせる。

- `storyGoal`: その絵本で最後まで守る中心目的
- `mainQuestObject`: 探すもの、助ける対象、叶えたいこと
- `forbiddenQuestObjects`: hidden detail や背景小物が主目的に昇格しないよう除外する対象

例:

- `storyGoal`: たっちゃんが、すなばで出会ったほしのこと一緒に、なくした星のかけらを探す
- `mainQuestObject`: 星のかけら
- `forbiddenQuestObjects`: すいか、食べもの、別のおもちゃ

これにより、hidden detail に「すいか模様の雲」があっても、物語の主筋が「すいか探し」にずれないようにする。

### visualMotif と hiddenDetail は役割を分ける

- `visualMotif`: 物語の中心や伏線に使ってよい。本文にも自然に出してよい
- `hiddenDetail`: 原則として本文の主筋に使わず、絵の中で見つけて楽しい小ネタに留める

つまり、`visualMotif` は「物語の芯に触れてよい要素」、`hiddenDetail` は「背景の遊び」である。

### imagePromptTemplate 強化方針

fixed_template でも、単なる主人公正面絵ではなく「絵本としてめくりたくなる絵」を増やすため、`imagePromptTemplate` には以下を含める方針で整備する。

- `wide shot / medium shot / close-up / back view / detail shot` などの構図指定
- recurring motif の配置
- 場所らしさが伝わる背景情報
- 小物や自然物などの探し要素
- `rich but not cluttered`
- `no text / no letters / no readable signs`

さらに通常の guided_ai / original_ai では、画像 prompt をモデル別に出し分ける。

- `pro_consistent`: 背景、小物、hidden detail、visual motif まで含めた詳細 prompt
- `klein_fast` / `klein_base`: 主役、構図、行動、背景、小物 1〜2 個に絞った短め prompt

目的は、Klein 系に複雑すぎる指示を詰め込みすぎて破綻するのを防ぎつつ、Pro では絵本らしい奥行きを活かすこと。

### 本文と画像プロンプトは分離する

EhonAI では、本文と画像プロンプトをはっきり分離する。

- `pages[].text` は、アプリ上で読むための本文
- `pages[].imagePrompt` は、**文字のない挿絵** を生成するための場面説明

画像側では、以下を守る。

- 絵の中に文字は描かせない
- `repeatedPhrase` はアプリ側の本文として扱い、画像に書き込ませない
- `visualMotif` は文字ではなく、色・形・小物・自然物として描く
- 看板、本、紙、カード、ラベル、ふきだしなどにも読める文字を入れない

### pageVisualRole でページの役割を変える

guided_ai / original_ai では、ページごとに `pageVisualRole` を持てるようにし、構図や焦点の役割を変える。

例:

- `opening_establishing`
- `discovery`
- `action`
- `emotional_closeup`
- `object_detail`
- `setback_or_question`
- `payoff`
- `quiet_ending`

これにより「毎ページ、主人公が中央に立つだけ」の絵を減らし、景色、小物、後ろ姿、手元、余韻のある終わり方を増やす。

また、`pageVisualRole` は Gemini から未知値が返っても即失敗にせず、サーバー側で既知値へ正規化する。

- 既知 alias は正規化する
- 正規化できない場合はページ番号ベースの default role に fallback する

これにより、演出用補助フィールドのわずかな表記ゆれだけで絵本全体を failed にしない。

### 4ページ構成での pageVisualRole 別本文設計

4ページ絵本では、pageVisualRole を画像構図だけでなく本文構造にも使う。

- `opening_establishing`
  - 場所を示す
  - 主人公が何をしているかを示す
  - storyGoal につながる小さな異変や発見を入れる
  - 次ページへの予感を入れる
- `discovery`
  - 何を見つけたか
  - それがなぜ不思議か
  - 相手や物が何に困っているか
  - 主人公がどう反応したか
- `action`
  - mainQuestObject を探すために何をするか
  - どこを探すか
  - 小さな手がかりがどう進むか
  - 同じ目的に向かっていることを明確にする
- `emotional_closeup`
  - 表情、手元、気持ち
  - 何を感じたか、何を決めたか
- `object_detail`
  - 小物の見た目
  - その小物が storyGoal にどう関係するか
- `setback_or_question`
  - 見つからない、迷う、問いが生まれる
  - ただし別目的に脱線しない
- `payoff`
  - mainQuestObject が見つかる
  - setup や visualMotif が回収される
- `quiet_ending`
  - 見つかった後の安心感
  - ありがとう、うれしさ、余韻
  - 別目的は持ち込まない

### 3歳以上では意味量を持たせる

3歳以上では、短いだけの本文や音遊びだけの本文をよしとしない。

- 3歳向けでも、場所・行動・気持ち・発見のうち 2 つ以上を自然に含める
- 1ページ 3〜4 文程度を目安に、意味の通る短い物語文にする
- premium では本文 rewrite pass で日本語の自然さと意味量をさらに整える

### 登場人物の一貫性は child だけでなく cast 全体で管理する

主人公の子どもだけでなく、相棒、動物、魔法キャラ、ものキャラなどの recurring character も `cast` で管理する。

- `cast[].characterId` で物語全体の同一存在を識別する
- `pages[].appearingCharacterIds` でそのページに出るキャラを明示する
- `pages[].focusCharacterId` でそのページの主役キャラを示す
- 各キャラは `visualBible / signatureItems / doNotChange / colorPalette / silhouette` を持てる

これにより、「同じ存在のはずなのに毎ページ別キャラに見える」問題を減らしやすくする。

### サブキャラの signature item / silhouette / colorPalette を固定する

子ども以外の主要キャラでも、ページをまたいで固定したい視覚アンカーを持たせる。

例:

- 帽子
- ネックレス
- 尾の形
- 発光の色
- 体型やシルエット
- 服の色の組み合わせ

画像 prompt では、登場するキャラごとに「変えてはいけない要素」と「変えてよい要素」を分けて渡す。

### 将来の相棒キャラ参照画像への接続

将来的には、`cast[].approvedImageUrl` / `cast[].referenceImageUrl` をページごとの画像生成で参照できるようにする。

- child protagonist の参照画像
- buddy / magical friend / animal の参照画像
- 必要なページでは両方を `input_images` に渡す

現在の実装でも、`appearingCharacterIds` に対応する cast の `approvedImageUrl` / `referenceImageUrl` があれば、ページ参照画像に加える構造を持てるようにしている。

### 入力項目

#### 必須

- `childName`: 子どもの名前

#### テンプレートによって必須

- `place`: 場所
- `familyMembers`: 一緒にいた人
- `parentMessage`: 親からのひとこと

#### 任意

- `childAge`: 年齢
- `favorites`: 好きなもの
- `season`: 季節
- `colorMood`: 雰囲気

---

## 2-3. テンプレート案 10本

---

## Template 01: はじめてのどうぶつえん

### 内部ID案

```text
fixed-first-zoo
```

### カテゴリ

```text
思い出を残す
```

### 説明文

```text
はじめてのおでかけを、やさしく早く絵本に残せるテンプレート
```

### 親向けコピー

```text
写真には残せない「その日の気持ち」まで、短い絵本にして残します。
```

### 必須入力

- 子どもの名前
- 行った場所
- 一緒に行った人

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

本文テンプレート:

```text
{childName}は、{familyMembers}といっしょに{place}へでかけました。
```

画像プロンプト:

```text
A young child arriving at a friendly zoo with family, warm morning light, soft Japanese picture book style, gentle smiles, child-safe atmosphere
```

#### 2ページ目

本文テンプレート:

```text
大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。
```

画像プロンプト:

```text
A child happily watching friendly zoo animals from a safe distance, sparkling eyes, warm family memory, soft watercolor picture book illustration
```

#### 3ページ目

本文テンプレート:

```text
いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。
```

画像プロンプト:

```text
A joyful close family moment at the zoo, the child smiling brightly, emotional keepsake picture book scene, golden sunlight
```

#### 4ページ目

本文テンプレート:

```text
{parentMessage}
```

画像プロンプト:

```text
A calm ending scene after a zoo visit, family walking home with happy memories, soft golden evening light, tender picture book finale
```

---

## Template 02: きょうもいい日だったね

### 内部ID案

```text
fixed-bedtime-good-day
```

### カテゴリ

```text
寝る前に安心する
```

### 説明文

```text
寝る前に短く読める、安心感のあるおやすみテンプレート
```

### 親向けコピー

```text
一日の終わりに、安心して眠れる言葉を届けます。
```

### 必須入力

- 子どもの名前

### 任意入力

- 親からのひとこと
- 今日うれしかったこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、きょうもたのしいじかんをすごしました。
```

```text
A child at the end of a happy day, cozy home evening, soft moonlight, calm Japanese bedtime picture book atmosphere
```

#### 2ページ目

```text
うれしかったことを、ひとつずつこころにあつめます。
```

```text
A child remembering happy moments before bed, dreamy room, warm lamp light, gentle bedtime storybook feeling
```

#### 3ページ目

```text
おふとんに入ると、こころがふわっとやわらかくなりました。
```

```text
A child snuggling into bed, peaceful sleepy expression, soft blanket, stars and moon outside the window
```

#### 4ページ目

```text
{parentMessage}
```

```text
A comforting goodnight ending scene, child sleeping peacefully, warm secure bedtime picture book finale
```

---

## Template 03: はみがきできたよ

### 内部ID案

```text
fixed-brush-teeth
```

### カテゴリ

```text
成長を応援
```

### 説明文

```text
寝る前のはみがきを、やさしく応援できる固定テンプレート
```

### 親向けコピー

```text
怒るより、物語でそっと背中を押すはみがき絵本です。
```

### 必須入力

- 子どもの名前

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、きょうもおくちをあーん。
```

```text
A preschool child getting ready to brush teeth in a bright safe bathroom, gentle picture book mood
```

#### 2ページ目

```text
しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。
```

```text
A child brushing teeth carefully, cute bathroom scene, supportive and playful storybook atmosphere
```

#### 3ページ目

```text
おわったあと、{childName}はちょっぴりうれしそうでした。
```

```text
A child smiling with pride after brushing teeth, warm daily routine success, Japanese picture book illustration
```

#### 4ページ目

```text
{parentMessage}
```

```text
A comforting bedtime routine ending after brushing teeth, parent and child calm happy mood
```

---

## Template 04: はじめてのクリスマス

### 内部ID案

```text
fixed-first-christmas
```

### カテゴリ

```text
季節とイベント
```

### 説明文

```text
家族とのクリスマスの思い出を、やさしく残せる固定テンプレート
```

### 親向けコピー

```text
きらきらした季節の記憶を、絵本として残します。
```

### 必須入力

- 子どもの名前
- 一緒にいた人

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。
```

```text
A preschool child celebrating Christmas with family, warm lights, cozy home, festive storybook scene
```

#### 2ページ目

```text
おへやには、やさしいひかりと、うれしいきもちがいっぱいです。
```

```text
A gentle Christmas room full of soft lights and festive warmth, cozy family picture book atmosphere
```

#### 3ページ目

```text
{childName}のにこにこえがおを見て、みんなもにっこりしました。
```

```text
A happy child smiling during Christmas celebration, family sharing warm joy, tender seasonal picture book composition
```

#### 4ページ目

```text
{parentMessage}
```

```text
A peaceful Christmas ending scene with family warmth, soft winter glow, memorable and gentle picture book finale
```

---

## Template 05: はじめてのほいくえん

### 内部ID案

```text
fixed-first-preschool
```

### カテゴリ

```text
成長を応援
```

### 説明文

```text
新しい場所への一歩を、やさしく応援する絵本
```

### 親向けコピー

```text
不安な気持ちも、少しずつ「だいじょうぶ」に変えていきます。
```

### 必須入力

- 子どもの名前

### 任意入力

- 園の名前
- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、あたらしいばしょへいく日をむかえました。
```

```text
A child standing near a preschool entrance, slightly nervous but curious, soft morning light, gentle picture book style
```

#### 2ページ目

```text
はじめて見るものがいっぱいで、こころがどきどきします。
```

```text
A child looking around a preschool classroom with toys and colorful shelves, tender nervous excitement
```

#### 3ページ目

```text
でも、ひとつ笑えることを見つけると、すこしだけ安心しました。
```

```text
A child finding a small joyful moment at preschool, warm teacher and friendly children nearby, soft supportive mood
```

#### 4ページ目

```text
{parentMessage}
```

```text
A parent and child sharing a warm hug after preschool, gentle reassurance, emotional picture book finale
```

---

## Template 06: ひとりでできたよ

### 内部ID案

```text
fixed-i-did-it
```

### カテゴリ

```text
成長を応援
```

### 説明文

```text
小さな「できた」を大きな自信に変える絵本
```

### 親向けコピー

```text
日常の小さな成功を、自己肯定感につながる物語にします。
```

### 必須入力

- 子どもの名前
- できるようになったこと

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、きょう、ひとつチャレンジしました。
```

```text
A young child preparing to try a small challenge at home, warm encouraging atmosphere, soft picture book style
```

#### 2ページ目

```text
さいしょは、ちょっとむずかしそうに見えました。
```

```text
A child looking thoughtfully at a small daily challenge, gentle supportive home scene
```

#### 3ページ目

```text
でも、ゆっくりやってみると、できました。
```

```text
A child succeeding at a small task, joyful proud smile, warm sunlight, uplifting storybook scene
```

#### 4ページ目

```text
{parentMessage}
```

```text
A parent celebrating a child's small achievement, tender hug, glowing warm picture book finale
```

---

## Template 07: おたんじょうびのひ

### 内部ID案

```text
fixed-birthday
```

### カテゴリ

```text
季節とイベント
```

### 説明文

```text
誕生日の一日を、特別な記念絵本にするテンプレート
```

### 親向けコピー

```text
「生まれてきてくれてありがとう」を、絵本で残します。
```

### 必須入力

- 子どもの名前
- 年齢

### 任意入力

- 一緒に祝った人
- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
きょうは、{childName}のたいせつなおたんじょうびです。
```

```text
A birthday morning scene for a young child, soft decorations, warm family atmosphere, joyful picture book style
```

#### 2ページ目

```text
おへやには、うれしいきもちがふわふわひろがっています。
```

```text
A cozy birthday room with balloons and gentle colors, child-safe festive picture book illustration
```

#### 3ページ目

```text
{childName}が笑うと、みんなのこころもぱっと明るくなりました。
```

```text
A smiling child at a birthday celebration, warm family joy, soft glowing light
```

#### 4ページ目

```text
{parentMessage}
```

```text
A tender birthday finale with parent and child, gentle celebration, emotional keepsake picture book mood
```

---

## Template 08: おやさいとなかよし

### 内部ID案

```text
fixed-friendly-vegetables
```

### カテゴリ

```text
成長を応援
```

### 説明文

```text
苦手な食べものに、少しだけ近づける応援絵本
```

### 親向けコピー

```text
無理に食べさせるのではなく、「ちょっと見てみよう」から始めます。
```

### 必須入力

- 子どもの名前
- 食べもの名

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}のまえに、ちいさな{favorites}がやってきました。
```

```text
A cute friendly vegetable character appearing near a child, playful kitchen scene, soft picture book style
```

#### 2ページ目

```text
「こわくないよ」と、{favorites}はにこっとわらいました。
```

```text
A friendly smiling vegetable character speaking gently to a child, warm kitchen light, playful child-safe mood
```

#### 3ページ目

```text
{childName}は、すこしだけ近くで見てみることにしました。
```

```text
A child curiously looking at a friendly vegetable, small step of courage, gentle supportive illustration
```

#### 4ページ目

```text
{parentMessage}
```

```text
A warm parent-child kitchen scene, gentle encouragement, cozy picture book finale
```

---

## Template 09: だいすきな電車のたび

### 内部ID案

```text
fixed-train-trip
```

### カテゴリ

```text
好きな世界に入る
```

### 説明文

```text
電車好きのお子さんにぴったりの、やさしい冒険テンプレート
```

### 親向けコピー

```text
好きなものを主役にすると、絵本はもっと自分ごとになります。
```

### 必須入力

- 子どもの名前

### 任意入力

- 好きな電車
- 行きたい場所
- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、だいすきな電車にのって出発しました。
```

```text
A child boarding a friendly colorful train, bright station, cheerful safe picture book atmosphere
```

#### 2ページ目

```text
まどのそとには、知らない景色がどんどん流れていきます。
```

```text
A child looking out a train window at beautiful passing scenery, soft colors, sense of wonder
```

#### 3ページ目

```text
電車は、{childName}のわくわくをのせて、まっすぐ走ります。
```

```text
A friendly train traveling through a bright landscape, child smiling with excitement, dynamic but gentle illustration
```

#### 4ページ目

```text
{parentMessage}
```

```text
A calm train journey ending, child and family smiling, warm storybook finale
```

---

## Template 10: ありがとうを届けよう

### 内部ID案

```text
fixed-thank-you
```

### カテゴリ

```text
こころを育てる
```

### 説明文

```text
「ありがとう」の気持ちを、自然に育てるやさしい絵本
```

### 親向けコピー

```text
感謝の言葉を、説教ではなく物語で伝えます。
```

### 必須入力

- 子どもの名前
- ありがとうを伝えたい相手

### 任意入力

- 親からのひとこと

### 4ページ構成

#### 1ページ目

```text
{childName}は、だれかに「ありがとう」を届けたくなりました。
```

```text
A child holding a small thank-you card, warm home or garden scene, gentle emotional picture book style
```

#### 2ページ目

```text
どんな言葉にしようかな。{childName}は、こころの中をそっと見つめます。
```

```text
A thoughtful child preparing a thank-you message, soft light, tender expression
```

#### 3ページ目

```text
「ありがとう」と言うと、相手の顔がぱっと明るくなりました。
```

```text
A child giving thanks to someone, both smiling warmly, golden emotional picture book scene
```

#### 4ページ目

```text
{parentMessage}
```

```text
A gentle finale showing kindness and gratitude, warm family atmosphere, soft picture book ending
```

---

# 3. かんたんカスタム

## 3-1. 位置づけ

### 目的

親が質問に答えるだけで、AIがある程度オリジナル化する。  
一般ユーザーに最も刺さりやすい主力導線。

補足:

- guided_ai / original_ai は Gemini で story JSON を1冊ぶん生成してから、各ページの画像を順に生成する。
- そのため、本文の薄さは story quality gate で、人物一貫性は reference image と image model profile で改善していく。

### ユーザー心理

- うちの子らしさを入れたい
- でも文章を全部書くのは大変
- AIに任せたいが、方向性は選びたい
- 失敗しない程度にカスタムしたい

### モード説明文

```text
いくつかの質問に答えるだけで、お子さんらしい絵本をAIが作ります。
迷ったときは選択肢から選べるので、はじめてでも安心です。
```

### 短い説明

```text
質問に答えてAIが作る
```

### CTA

```text
質問に答えて作る
```

---

## 3-2. 入力画面コピー

### 画面タイトル

```text
どんな絵本にしたいですか？
```

### サブコピー

```text
うまく書けなくても大丈夫。
選んだ答えをもとに、AIがやさしい絵本に整えます。
```

---

## 3-3. 質問セット

### Q1. 今日はどんな気持ちを絵本に残したいですか？

#### UIラベル

```text
絵本にしたい気持ち
```

#### 選択肢

```text
がんばったことをほめたい
寝る前に安心させたい
新しいことに挑戦してほしい
楽しかった思い出を残したい
好きなものをもっと伸ばしたい
やさしい気持ちを育てたい
```

#### 保存フィールド案

```text
parentIntent
```

---

### Q2. お子さんらしさを教えてください

#### UIラベル

```text
お子さんらしさ
```

#### プレースホルダー

```text
例：電車が好き、少し恥ずかしがり屋、動物を見ると笑う、がんばり屋さん
```

#### 保存フィールド案

```text
favorites
childPersonality
```

---

### Q3. どんな世界でお話にしたいですか？

#### UIラベル

```text
お話の世界
```

#### 選択肢

```text
森やどうぶつの世界
夜空や夢の世界
電車・車・ロボットの世界
魔法やファンタジーの世界
おうちや日常の世界
季節やイベントの世界
```

#### 保存フィールド案

```text
templateId
categoryGroupId
```

---

### Q4. 最後に伝えたいことはありますか？

#### UIラベル

```text
親からのメッセージ
```

#### プレースホルダー

```text
例：いつも見ているよ。できたね、すごいね。大好きだよ。
```

#### 保存フィールド案

```text
parentMessage
```

---

### Q5. 絵の雰囲気を選んでください

#### UIラベル

```text
絵のタッチ
```

#### 選択肢

```text
やさしい水彩
ふんわりパステル
クレヨン風
フラットイラスト
アニメ絵本風
クラシック絵本風
3Dおもちゃ風
紙コラージュ風
```

#### 保存フィールド案

```text
style
```

---

## 3-4. かんたんカスタム用テーマ案

### Theme 01: がんばった日の絵本

#### 説明文

```text
小さな挑戦を、やさしくほめる絵本にします。
```

#### 向いている場面

- トイレに挑戦した
- 保育園に行けた
- はみがきできた
- 泣かずにがんばった
- 苦手なことに挑戦した

#### AI生成方針

```text
説教ではなく、主人公の小さな勇気に焦点を当てる。
失敗しても責めず、最後は「やってみたこと自体がすごい」と伝える。
```

---

### Theme 02: 寝る前の安心絵本

#### 説明文

```text
一日の終わりに、安心して眠れるお話を作ります。
```

#### 向いている場面

- 寝かしつけ
- 夜が少し怖い
- 今日の気持ちを落ち着けたい
- 親子で静かに読みたい

#### AI生成方針

```text
刺激の強い冒険は避け、月、星、ぬいぐるみ、やさしい声、深呼吸などを使う。
文章は短く、繰り返しを多めにする。
```

---

### Theme 03: 好きなもの冒険絵本

#### 説明文

```text
電車、恐竜、動物、プリンセスなど、好きなものを主役にした絵本を作ります。
```

#### 向いている場面

- 子どもの好きなものを伸ばしたい
- 自分ごとの絵本にしたい
- 読み聞かせへの興味を高めたい

#### AI生成方針

```text
子どもの好きなものを単なる小物ではなく、物語の中心に置く。
「好き」が自信や発見につながる構成にする。
```

---

### Theme 04: 思い出を残す絵本

#### 説明文

```text
旅行、誕生日、おでかけなどの思い出を、やさしい絵本にします。
```

#### 向いている場面

- 初めての旅行
- 動物園
- 水族館
- 誕生日
- 祖父母との時間
- 季節イベント

#### AI生成方針

```text
出来事の記録だけでなく、親が覚えておきたい感情を物語に入れる。
「その日、どんな表情だったか」が伝わる絵本にする。
```

---

### Theme 05: こころを育てる絵本

#### 説明文

```text
やさしさ、勇気、自信、ありがとうの気持ちを育てる絵本です。
```

#### 向いている場面

- 友だちにやさしくしてほしい
- 自信を持ってほしい
- ありがとうを伝えられるようになってほしい
- 不安な気持ちを受け止めたい

#### AI生成方針

```text
直接的な教訓ではなく、主人公の体験を通じて自然に気づける構成にする。
```

---

## 3-5. guided_ai 共通システムプロンプト案

```text
あなたは幼児向け絵本の作家です。
親が入力した情報をもとに、安心して読み聞かせできる絵本を作ってください。

条件:
- 対象年齢は1〜8歳を想定する
- 怖すぎる描写、強い暴力、過度な不安表現は避ける
- 説教っぽくせず、場面と会話の中で自然に気づきを作る
- 主人公の子どもが少し前向きになれる結末にする
- 文章は短く、読み聞かせしやすいリズムにする
- 親からのメッセージがある場合は、最後のページに自然に入れる
- 各ページに画像生成しやすい、具体的で一貫した場面を作る
```

---

## 3-6. かんたんカスタム生成結果の構成

### 4ページ版

| ページ | 役割 |
|---|---|
| 1 | 子ども・場面・気持ちの導入 |
| 2 | 小さな出来事・発見 |
| 3 | 挑戦・変化・気づき |
| 4 | 安心・親からのメッセージ |

### 8ページ版

| ページ | 役割 |
|---|---|
| 1 | 導入 |
| 2 | 好きなもの・状況 |
| 3 | 小さな問題 |
| 4 | 迷い・不安 |
| 5 | 助け・発見 |
| 6 | やってみる |
| 7 | 小さな成功 |
| 8 | 親からのメッセージ・余韻 |

---

# 4. オリジナル

## 4-1. 位置づけ

### 目的

完全自由入力に近い上位機能。  
ギフト、記念日、思い出絵本、有料課金の軸にする。

### ユーザー心理

- 世界にひとつだけの絵本を作りたい
- 誕生日や記念日に贈りたい
- 家族の思い出を形にしたい
- 自分の言葉を絵本にしたい
- 子どもへのメッセージを残したい

### モード説明文

```text
伝えたいことや思い出を自由に書くと、AIが世界にひとつだけの絵本に整えます。
誕生日、旅行、成長の記録、ギフトにもおすすめです。
```

### 短い説明

```text
自由に作る
```

### CTA

```text
オリジナルで作る
```

---

## 4-2. 入力画面コピー

### 画面タイトル

```text
世界にひとつだけの絵本を作る
```

### サブコピー

```text
うまく文章にできなくても大丈夫。
思い出、願い、好きなもの、伝えたい言葉を自由に書いてください。
AIがやさしい絵本に整えます。
```

### 入力欄ラベル

```text
どんな絵本にしたいですか？
```

### プレースホルダー

```text
例：
3歳の娘が、はじめて一人で滑り台をすべれた日のことを絵本にしたいです。
最初は怖がっていたけれど、最後には笑顔で「もう一回！」と言いました。
最後は「できたね、すごいね」と伝えたいです。
```

---

## 4-3. オリジナル入力補助プリセット

### Preset 01: 誕生日の絵本

```text
お子さんの誕生日に贈る絵本を作ります。
生まれてきてくれた喜び、成長したところ、これから伝えたい気持ちを書いてください。
```

#### 入力例

```text
4歳の息子の誕生日に贈る絵本にしたいです。
電車が大好きで、最近は自分で靴を履けるようになりました。
少し恥ずかしがり屋だけど、家ではよく笑います。
最後は「生まれてきてくれてありがとう」と伝えたいです。
```

---

### Preset 02: はじめてできた日の絵本

```text
はじめてできたことを、成長の記録として絵本にします。
```

#### 入力例

```text
娘がはじめて補助輪なしの自転車に乗れた日のことを絵本にしたいです。
何度も転びそうになったけれど、最後は少しだけ前に進めました。
できた瞬間の笑顔を残したいです。
```

---

### Preset 03: 旅行・おでかけの絵本

```text
家族で出かけた日の思い出を、絵本として残します。
```

#### 入力例

```text
家族で水族館に行った日のことを絵本にしたいです。
息子はクラゲの水槽をじっと見ていて、「おほしさまみたい」と言いました。
その言葉がかわいかったので、物語に入れたいです。
```

---

### Preset 04: 寝る前に読む安心絵本

```text
夜に不安になりやすい子へ、安心できる絵本を作ります。
```

#### 入力例

```text
最近、娘が寝る前に「こわい」と言うことがあります。
お気に入りのうさぎのぬいぐるみと一緒に、安心して眠れる絵本にしたいです。
最後は「ママとパパはいつもそばにいるよ」と伝えたいです。
```

---

### Preset 05: 祖父母へのギフト絵本

```text
おじいちゃん・おばあちゃんに贈れる、家族の思い出絵本を作ります。
```

#### 入力例

```text
祖父母にプレゼントする絵本を作りたいです。
孫と一緒に公園で遊んだ日のことを描きたいです。
シャボン玉を追いかけて笑っていた場面を中心に、あたたかい絵本にしてください。
```

---

### Preset 06: 子どもへの応援メッセージ絵本

```text
新しい環境や挑戦を迎える子に、応援の気持ちを届けます。
```

#### 入力例

```text
来月から幼稚園に通う息子に向けた絵本を作りたいです。
新しい場所に少し不安があるようですが、好きな恐竜と一緒なら勇気が出ると思います。
最後は「少しずつで大丈夫」と伝えたいです。
```

---

## 4-4. original_ai 共通システムプロンプト案

```text
あなたは幼児向けのパーソナライズ絵本作家です。
親の自由入力をもとに、世界にひとつだけの絵本を作ってください。

条件:
- 親の入力に含まれる感情、思い出、願いを大切にする
- 子どもが主役であることを明確にする
- 子ども本人を傷つける表現、比較、否定的な決めつけは避ける
- 親からのメッセージは最後に自然に入れる
- 記念日やギフト用途の場合は、保存したくなる余韻を重視する
- ストーリーは幼児が理解しやすい短い文章で構成する
- 各ページの画像プロンプトは、場面・人物・感情・雰囲気が具体的に分かるようにする
```

---

## 4-5. オリジナルの入力バリデーション案

### 最低入力

```text
childName
storyRequest
```

### 推奨入力

```text
childName
childAge
storyRequest
parentMessage
style
pageCount
```

### 入力が短すぎる場合の補助文

```text
もう少しだけ教えてください。
どんな出来事を絵本にしたいか、最後にどんな気持ちを伝えたいかを書くと、より特別な絵本になります。
```

### 入力例を出すボタン

```text
入力例を見る
```

### AI補助ボタン

```text
文章を整えてもらう
```

---

# 5. UI文言まとめ

## 5-1. 作り方選択画面

### タイトル

```text
絵本の作り方を選んでね
```

### サブタイトル

```text
すぐ作る、質問に答える、自由に作る。
今の気持ちに合う作り方を選べます。
```

### カード文言

#### テンプレート

```text
テンプレート
早い・安い・失敗しにくい
```

#### かんたんカスタム

```text
かんたんカスタム
質問に答えてAIが作る
```

#### オリジナル

```text
オリジナル
自由に作る
```

---

## 5-2. 空状態メッセージ

```text
この条件に合うテーマはまだありません
```

```text
作り方か目的を変えると、別の絵本が選べます。
```

---

## 5-3. 生成中メッセージ

```text
絵本を作っています
```

```text
お子さんが主役になるように、文章と絵を整えています。
```

```text
もう少しで、世界にひとつの絵本ができます。
```

---

## 5-4. 完成メッセージ

```text
絵本ができました
```

```text
お子さんだけの物語が完成しました。
一緒に読んで、気に入ったら保存しましょう。
```

---

# 6. Firestore seed化する場合の方針

## 6-1. テンプレートデータの推奨構造

```ts
{
  name: string;
  description: string;
  icon: string;
  categoryGroupId: string;
  subcategoryId: string;
  parentIntent: string;
  recommendedAgeMin: number;
  recommendedAgeMax: number;
  requiredInputs: string[];
  optionalInputs: string[];
  themeTags: string[];
  creationMode: "fixed_template" | "guided_ai" | "original_ai";
  priceTier: "ume" | "take" | "matsu";
  storyCostLevel: "none" | "low" | "standard";
  sampleImageUrl: string;
  sampleImageAlt: string;
  visualDirection: string;
  order: number;
  active: boolean;
  systemPrompt: string;
  fixedStory?: {
    titleTemplate: string;
    pages: {
      textTemplate: string;
      imagePromptTemplate: string;
    }[];
  };
}
```

---

# 7. Claude Code向け実装プロンプト

## 7-1. テンプレート追加用

```text
以下の方針で story-gen リポジトリに絵本テンプレートを追加してください。

目的:
- fixed_template / guided_ai / original_ai の3つのCreationModeに沿って、テンプレートデータを整理する
- MVPでは fixed_template を中心に、4ページ固定の短い絵本テンプレートを追加する
- 既存の TemplateData 型、CategoryGroupData 型、seed-templates.ts の構造に合わせる

実装内容:
1. functions/src/seed-templates.ts に fixed_template のテンプレートを追加
2. 各テンプレートに以下を設定
   - name
   - description
   - icon
   - categoryGroupId
   - subcategoryId
   - parentIntent
   - recommendedAgeMin / recommendedAgeMax
   - requiredInputs / optionalInputs
   - themeTags
   - creationMode
   - priceTier
   - storyCostLevel
   - sampleImageUrl
   - sampleImageAlt
   - visualDirection
   - order
   - active
   - systemPrompt
   - fixedStory
3. TypeScript型エラーが出ないようにする
4. 既存テンプレートとのorder重複を避ける
5. 変更後に npm run lint / npm run build が通るようにする

追加するテンプレート:
- はじめてのどうぶつえん
- きょうもいい日だったね
- はみがきできたよ
- はじめてのクリスマス
- はじめてのほいくえん
- ひとりでできたよ
- おたんじょうびのひ
- おやさいとなかよし
- だいすきな電車のたび
- ありがとうを届けよう
```

---

## 7-2. guided_ai 追加用

```text
guided_ai 用のかんたんカスタム導線を実装してください。

目的:
- 親が質問に答えるだけで、AIが絵本を生成できるようにする
- 自由入力を強制せず、選択肢 + 短い自由入力で迷いにくいUIにする

実装内容:
1. create/input 画面で creationMode が guided_ai の場合、質問形式UIを表示
2. 以下の質問を表示
   - 今日はどんな気持ちを絵本に残したいですか？
   - お子さんらしさを教えてください
   - どんな世界でお話にしたいですか？
   - 最後に伝えたいことはありますか？
   - 絵の雰囲気を選んでください
3. 回答を BookInput にマッピング
4. generateBook 側で storyRequest / favorites / parentMessage / style に反映
5. guided_ai のテンプレートは creationMode: "guided_ai" でフィルタできるようにする
6. TypeScript型エラーとビルドエラーを解消する
```

---

## 7-3. original_ai 追加用

```text
original_ai 用の自由入力導線を実装してください。

目的:
- 親が自由に書いた思い出や願いをもとに、AIがオリジナル絵本を作れるようにする
- ギフト、記念日、思い出絵本向けの上位体験にする

実装内容:
1. creationMode が original_ai の場合、自由入力中心のUIを表示
2. 入力欄タイトルは「どんな絵本にしたいですか？」
3. プレースホルダーに具体例を表示
4. 入力補助プリセットを用意
   - 誕生日の絵本
   - はじめてできた日の絵本
   - 旅行・おでかけの絵本
   - 寝る前に読む安心絵本
   - 祖父母へのギフト絵本
   - 子どもへの応援メッセージ絵本
5. 最低入力は childName と storyRequest
6. storyRequest が短すぎる場合は補助メッセージを出す
7. generateBook 側で original_ai 用の systemPrompt を使えるようにする
8. TypeScript型エラーとビルドエラーを解消する
```

---

# 8. 今後の追加検討

## 8-1. 追加すると強い機能

- 子どもプロフィール登録
- 子どもの見た目プロンプト保存
- キャラクター一貫性モード
- PDF出力
- 読み聞かせ音声
- 祖父母共有リンク
- 印刷向け高解像度出力
- 表紙だけ無料プレビュー
- 生成前のあらすじ確認
- 親からの手紙ページ

## 8-2. 課金導線の考え方

| モード | 無料/有料 | 理由 |
|---|---|---|
| テンプレート | 無料〜低価格 | 生成コストが低く、体験入口に向いている |
| かんたんカスタム | 標準課金 | 主力体験。満足度とコストのバランスが良い |
| オリジナル | 高価格 | 自由度・生成コスト・ギフト価値が高い |

---

# 9. まとめ

EhonAIでは、3モードを以下のように扱うとよい。

```text
テンプレート = すぐ作れる入口
かんたんカスタム = 主力の一般ユーザー向け体験
オリジナル = 記念日・ギフト・有料課金向け体験
```

MVPではまず `fixed_template` を厚くし、その後 `guided_ai` を主力導線として磨き、最後に `original_ai` を高付加価値機能として強化する。

実装順序としては以下が現実的。

```text
1. fixed_template 10本をseed化
2. guided_ai の質問UIを追加
3. original_ai の自由入力UIを追加
4. プラン別制御を強化
5. 子どもプロフィール・キャラクター一貫性と接続
```
