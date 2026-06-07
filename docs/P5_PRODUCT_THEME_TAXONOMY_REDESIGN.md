# P5 Product: Redesign theme taxonomy by age, learning goal, and story pattern

## 1. Inventory of Current Theme/Template Categories

### 1.1 Category Groups (9)
Current category groups used for filtering in the UI:
- **思い出を残す (memories)**: 記念日やはじめての出来事
- **成長を応援 (growth-support)**: 生活習慣やお手伝い
- **こころを育てる (emotional-growth)**: 勇気、やさしさ、自信
- **寝る前に安心する (bedtime)**: 入眠儀式、夜の静かなおはなし
- **毎日のくらし (daily-life)**: 日常の発見や気づき
- **好きな世界に入る (favorite-worlds)**: 動物、乗り物、食べ物
- **想像の世界で遊ぶ (imagination)**: 魔法、宇宙、冒険
- **楽しく学ぶ (learning)**: 数字、色、形、ひらがな
- **季節とイベント (seasonal-events)**: 四季、クリスマス、誕生日

### 1.2 Existing Templates (25)

#### Guided AI Templates (10)
Users provide minimal input, AI generates custom story.
- animals (どうぶつのおはなし)
- adventure (わくわく冒険)
- fantasy (まほうの世界)
- bedtime (おやすみ前のおはなし)
- emotional-growth (こころを育てる)
- daily-habits (生活習慣をまなぶ)
- educational (たのしく学ぶ)
- food (おいしいおはなし)
- seasonal (季節とイベント)
- vehicles-robots (のりもの・ロボット)

#### Fixed Templates (14)
Fixed narrative structures and image prompts.
- fixed-first-zoo / fixed-first-zoo-8p (はじめてのどうぶつえん)
- fixed-first-birthday / fixed-first-birthday-8p (はじめてのたんじょうび)
- fixed-bedtime-good-day (きょうもいい日だったね)
- fixed-brush-teeth / fixed-brush-teeth-8p (はみがきできたよ)
- fixed-first-christmas (はじめてのクリスマス)
- fixed-sharing-friends (おともだちとわけっこできたね)
- fixed-sleepy-moon-adventure / fixed-sleepy-moon-adventure-8p (おつきさまと おやすみぼうけん)
- fixed-cardboard-rocket (ダンボールロケットでしゅっぱつ)
- fixed-rainy-day-puddle (あめの日の みずたまり)
- fixed-little-helper (ちいさなおてつだい)

#### Original AI (1)
- original-ai (オリジナル絵本)

---

## 2. Proposed New Taxonomy

To better align with caregiver intent, we propose a multi-axial taxonomy.

### 2.1 Taxonomy Axes

| Axis | Values |
|---|---|
| **Age Range** | 0–2 (Infant/Toddler), 3–5 (Preschool), 6+ (Early Elementary) |
| **Learning Goal** | Colors, Numbers, Feelings, Textures, Taste, Social behavior, Cooperation |
| **Story Pattern** | Repetition (くり返し), Journey (いってきます), Problem-solving, Cumulative cooperation (大きなかぶ形式), Humor (ユーモア), Surprise ending (意外な結末) |
| **Character Type** | Animals, Family, Friends, Fantasy, Everyday objects |
| **Tone** | Gentle (やさしい), Funny (おもしろい), Adventurous (わくわく), Emotional (じーんとする), Bedtime (おやすみ) |

### 2.2 Primary User-Facing Categories (13)

These represent the main entry points for discovery on the mobile UI.

1. **はじめての体験 (First Times)**
   - Age: 0–5. Tone: Emotional/Gentle. Story: Memory/Journey.
2. **感触と感覚 (Sensory & Sensation)**
   - Age: 0–2. Learning: Textures/Taste. Story: Repetition.
3. **生活習慣をたのしく (Habits & Growth)**
   - Age: 1–5. Learning: Social behavior. Tone: Gentle.
4. **こころを育てる (Emotional Growth)**
   - Age: 3–6. Learning: Feelings/Cooperation. Tone: Emotional.
5. **おやすみ前のおはなし (Bedtime Stories)**
   - Age: All. Tone: Bedtime/Gentle.
6. **わくわく冒険 (Adventure & Discovery)**
   - Age: 3+. Tone: Adventurous. Story: Journey.
7. **まほうと空想 (Fantasy & Magic)**
   - Age: 3+. Tone: Adventurous/Gentle.
8. **どうぶつ・いきもの (Animals & Nature)**
   - Age: All. Character: Animals.
9. **たべもの・食育 (Food & Eating)**
   - Age: All. Learning: Taste.
10. **たのしく学ぶ (Playful Learning)**
    - Age: 2–7. Learning: Colors/Numbers.
11. **笑いとユーモア (Humor & Play)**
    - Age: 3+. Tone: Funny. Story: Humor/Surprise.
12. **季節とイベント (Seasons & Events)**
    - Age: All. Tone: Emotional/Gentle.
13. **みんなで協力 (Cooperation)**
    - Age: 3+. Story: Cumulative cooperation.

---

## 3. Mapping Existing Templates to New Taxonomy

| Template ID | New Primary Category | Age | Learning Goal | Story Pattern | Tone |
|---|---|---|---|---|---|
| **animals** | どうぶつ・いきもの | 2–7 | | | Gentle |
| **adventure** | わくわく冒険 | 3–8 | | Journey | Adventurous |
| **fantasy** | まほうと空想 | 3–8 | | | Gentle |
| **bedtime** | おやすみ前のおはなし | 1–6 | | | Bedtime |
| **emotional-growth** | こころを育てる | 3–8 | Feelings | | Emotional |
| **daily-habits** | 生活習慣をたのしく | 2–6 | Social behavior | | Gentle |
| **educational** | たのしく学ぶ | 2–7 | Numbers/Colors | | Gentle |
| **food** | たべもの・食育 | 2–7 | Taste (light) | | Gentle |
| **seasonal** | 季節とイベント | 2–8 | | | Emotional |
| **vehicles-robots** | わくわく冒険 | 2–8 | | | Adventurous |
| **fixed-first-zoo** | はじめての体験 | 1–6 | | Journey | Gentle |
| **fixed-first-birthday** | はじめての体験 | 1–6 | | | Emotional |
| **fixed-bedtime-good-day** | おやすみ前のおはなし | 1–6 | | | Bedtime |
| **fixed-brush-teeth** | 生活習慣をたのしく | 2–6 | Social behavior | | Gentle |
| **fixed-first-christmas** | 季節とイベント | 1–6 | | | Emotional |
| **fixed-sharing-friends** | こころを育てる | 3–8 | Cooperation | | Emotional |
| **fixed-sleepy-moon-adventure** | おやすみ前のおはなし | 2–8 | | | Bedtime |
| **fixed-cardboard-rocket** | まほうと空想 | 3–8 | | | Adventurous |
| **fixed-rainy-day-puddle** | はじめての体験 | 2–8 | | | Gentle |
| **fixed-little-helper** | 生活習慣をたのしく | 3–8 | Social behavior | | Gentle |
| **fixed-first-zoo-8p** | はじめての体験 | 1–6 | | Journey | Gentle |
| **fixed-first-birthday-8p** | はじめての体験 | 1–6 | | | Emotional |
| **fixed-brush-teeth-8p** | 生活習慣をたのしく | 2–6 | Social behavior | | Gentle |
| **fixed-sleepy-moon-adventure-8p** | おやすみ前のおはなし | 2–8 | | | Bedtime |

_Note: 8-page variants share the same taxonomy mapping as their 4-page counterparts. They are listed separately to enable complete variant coverage in future seed/UI work._

---

## 4. Identified Gaps for Future Content

Based on the new taxonomy and Cohort A feedback, the following areas are underserved:

### 4.1 Sensory & Sensation (Target: 0–2 years)
- **Textures**: "Fuwa-fuwa & Zara-zara" — Focus on onomatopoeia and tactile descriptions.
- **Tastes**: "Sweet, Sour, Bitter" — Exploring different foods through sensation.
- **Physical Sensation**: "Warm, Cold, Soft" — Understanding the world through touch.

### 4.2 Humor & Surprise (Target: 3–5 years)
- **Humor**: Absurd scenarios or funny character reactions.
- **Surprise Endings**: Stories that subvert expectations (e.g., the "scary monster" is just a shadow).
- **Tricksters**: "The Thief's Tricks" — Playful problem-solving.

### 4.3 Story Structures (Target: 3+ years)
- **Cumulative Cooperation**: "The Big Turnip" (大きなかぶ) style — One by one, characters join to solve a problem.
- **Repetition (Onomatopoeia focus)**: Stories designed for infants with rhythmic Japanese phrases.

### 4.4 Social & Diversity
- **Cooperation in Groups**: Scenarios involving 3+ friends or siblings working together.
- **Diversity**: Meeting characters with different strengths or backgrounds.

---

## 5. Mobile UX Recommendations for Discovery

To support this multi-axial taxonomy on mobile devices while maintaining compactness and discoverability:

### 5.1 Horizontal Axis Chips (Current Approach)
- Maintain the top horizontal scroll for "Primary Categories" (e.g., はじめて, 生活習慣, おやすみ).
- Use distinct icons to help quick recognition.

### 5.2 Faceted Search/Filters (New)
- **Age Filter**: A simple 3-way toggle (0–2, 3–5, 6+) at the top or within a "Filter" button.
- **Intent-Based Tags**: Add small tags to template cards indicating Tone (e.g., #おもしろい) or Learning Goal (e.g., #感触).

### 5.3 Grid Optimization
- **3-Column Grid for Selection Buttons**: As identified in mobile UX conventions, use 3-column grids for mode/category selections.
- **Card Sizing**: Use a 16:9 aspect ratio for template preview cards to ensure more items fit vertically on the screen.

### 5.4 Smart Recommendations
- Default the view based on the child's age if a profile is already selected.
- Highlight "Trending" or "Seasonally Relevant" templates (e.g., Christmas in December) at the top.
