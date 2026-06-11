import { TemplateData } from "../lib/types";
import { withFixedImagePromptSafety } from "../prompts/image-prompt-fragments";

export type NewFixedTemplateData = TemplateData & {
  templateId: string;
};

export const fixedStoryTemplates: NewFixedTemplateData[] = [
  {
    templateId: "fixed-first-zoo",
    name: "はじめてのどうぶつえん",
    description: "はじめてのおでかけを、やさしく早く絵本に残せるテンプレート",
    icon: "🦁",
    categoryGroupId: "memories",
    creationMode: "fixed_template",
    order: 3,
    active: true,
    systemPrompt: "固定テンプレートを使って、家族の思い出をやさしく残す絵本です。",
    fixedStory: {
      titleTemplate: "{childName}とはじめてのどうぶつえん",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a young child standing beside a decorative text-free zoo entrance arch with animal-shaped decorations and zoo paths, with family nearby, gentle daylight, warm welcoming atmosphere, soft watercolor style, recurring small yellow star motif tucked into the scene, child-safe and inviting composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "{childName}と はじめての どうぶつえん",
      openingNarrationTemplate:
        "きょうは とくべつな日。{childName}は {familyMembers}と いっしょに、はじめての どうぶつえんへ でかけます。",
      pages: [
        {
          textTemplate: "{childName}は、{familyMembers}といっしょに{place}へでかけました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: zoo entrance path with family, animal enclosures and trees. Establishing wide shot of a young child arriving at a friendly zoo with family. The child stands near a tree-lined path just inside the entrance, looking up with excitement. Family members walk beside the child. A decorative text-free entrance arch frames the top. A small yellow star motif is tucked into the arch. Gentle morning daylight with warm golden tones. Lush green trees and a winding path leading inward. Soft watercolor picture book style, soft painterly watercolor texture, no hard outlines, rich watercolor pigment blooms, rounded child-safe shapes, rich but not cluttered background details."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "大きなどうぶつ、小さなどうぶつ。{childName}の目はきらきらです。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: viewing animal enclosures from a safe path inside the zoo. Medium shot of a child at a zoo animal enclosure, leaning forward with wide curious eyes. A friendly elephant or giraffe stands in the mid-ground, while small birds or butterflies add life to the foreground. The child points with one hand, the other holding a parent's hand. Family members stand behind the child, smiling. A small yellow star motif is hidden on a fence post. Warm daylight filtering through leaves. Soft watercolor picture book style, clear foreground-midground-background layering, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "いちばんうれしかったのは、{childName}がにっこり笑ったその瞬間でした。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: zoo viewing area with animals in the distance, close-up emotional moment. Close-up of the child's face beaming with a big joyful smile after a special zoo moment. The child holds a small zoo souvenir or leaf in both hands near their chest. Soft-focus background shows a friendly animal and family members reacting warmly. A small yellow star motif appears on the souvenir or nearby. Warm afternoon light with golden highlights on the child's cheeks. Soft watercolor picture book style, emotional warmth, intimate framing, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: quiet zoo path at sunset leaving the zoo. Back-view wide shot of the child and family walking away from the zoo toward a golden-hour sunset. A gentle tree-lined path stretches ahead. The child holds a parent's hand, looking slightly back with a content smile. A small yellow star motif glows softly in the evening sky or on a nearby lantern. Warm amber and soft pink sunset tones. Soft watercolor picture book style, peaceful farewell composition, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-first-birthday",
    name: "はじめてのたんじょうび",
    description: "はじめての誕生日の思い出を、やさしく残せる固定テンプレート",
    icon: "🎂",
    categoryGroupId: "memories",
    creationMode: "fixed_template",
    order: 4,
    active: true,
    systemPrompt:
      "固定テンプレートを使って、はじめての誕生日の思い出をやさしく残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのたんじょうび",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a young child in front of a small birthday cake with family gathered close, warm indoor lights, soft pastel balloons, recurring tiny ribbon motif, joyful and tender keepsake mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "{childName}の はじめての たんじょうび",
      openingNarrationTemplate:
        "ろうそくの あかりが、そっと ゆれる日。{childName}と {familyMembers}の たんじょうびの思い出が はじまります。",
      pages: [
        {
          textTemplate:
            "{childName}は、{familyMembers}といっしょにおたんじょうびのじゅんびをはじめました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy home living room before a birthday celebration. A young child stands near a low table while family members decorate with pastel balloons and paper garlands. Soft warm light fills the room. A tiny ribbon motif appears on one balloon knot. Picture-book watercolor style, layered foreground-midground-background, rich but not cluttered details."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "ろうそくのひかりがゆれて、{childName}の目もきらきらひかりました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium shot of a child leaning toward a small birthday cake with softly glowing candles. Family members gather behind and beside the child, smiling with gentle anticipation. Warm candlelight highlights the child's eyes and cheeks. A tiny ribbon motif is tucked on a plate edge or cake stand. Soft watercolor picture book style, emotional family celebration framing, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "おいわいのうたのあと、{childName}はとびきりのえがおを見せてくれました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Close-up of the child's delighted face after the birthday song, cheeks glowing and eyes bright. The child holds a small spoon or keepsake near the chest while family members lean in with warm smiles in soft focus. A tiny ribbon motif appears on nearby party decor. Golden warm light and gentle pastel accents. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Back-view quiet ending shot of child and family sitting together at the end of the birthday evening, looking at a few softly glowing decorations in a calm room. The child leans gently on a family member's shoulder. A tiny ribbon motif catches the last warm light near the table. Soft watercolor picture book style, peaceful after-celebration mood, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-bedtime-good-day",
    name: "きょうもいい日だったね",
    description: "寝る前に短く読める、安心感のあるおやすみテンプレート",
    icon: "🛏️",
    categoryGroupId: "bedtime",
    creationMode: "fixed_template",
    order: 2,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前に安心して眠れる短い絵本を作ります。",
    fixedStory: {
      titleTemplate: "きょうもいい日だったね、{childName}",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a young child in cozy pajamas in a warm bedroom at dusk, soft moonlight through the window, favorite stuffed toy nearby, recurring small star motif, peaceful sleepy mood, soft watercolor style, child-safe gentle composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "きょうも いい日だったね、{childName}",
      openingNarrationTemplate:
        "よるが やさしく やってきました。{childName}の きょう一日を、ゆっくり ふりかえってみましょう。",
      pages: [
        {
          textTemplate: "{childName}は、きょうもたのしいじかんをすごしました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy child bedroom at early evening. The child sits on the floor surrounded by toys and picture books, looking toward a window where dusk light streams in. A warm bedside lamp glows in the corner. Curtains frame the window with a deep blue-purple sky outside. A small star motif is tucked into the lampshade or blanket. Soft watercolor picture book style, warm amber and lavender tones, child-safe rounded shapes, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "うれしかったことを、ひとつずつこころにあつめます。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium shot of a child sitting cross-legged on a soft rug, holding a small keepsake from the day (a leaf, a drawing, or a toy). The child looks down at it with a gentle, reflective smile. A warm lamp casts a soft orange glow. Small meaningful objects from the day are scattered nearby. A glowing star motif appears on a cushion or picture frame. Soft watercolor picture book style, warm introspective mood, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "おふとんに入ると、こころがふわっとやわらかくなりました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Close-up of a child snuggling into a fluffy blanket, hugging a favorite stuffed animal with both hands. Eyes half-closed with a peaceful, content expression. A pillow and soft sheets surround the child. Moonlight and stars are visible through a nearby window. A small star motif appears on the stuffed animal or pillowcase. Soft watercolor picture book style, intimate peaceful framing, warm ivory and soft blue tones, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide peaceful shot of the child asleep in bed, viewed from slightly above. The room is bathed in soft moonlight. A favorite stuffed toy rests beside the child. Stars twinkle outside the window. A small star motif glows gently near the windowsill or on the blanket edge. Calm, serene nighttime atmosphere. Soft watercolor picture book style, quiet lullaby composition, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-brush-teeth",
    name: "はみがきできたよ",
    description: "寝る前のはみがきを、やさしく応援できる固定テンプレート",
    icon: "🪥",
    categoryGroupId: "growth-support",
    creationMode: "fixed_template",
    order: 7,
    active: true,
    systemPrompt: "固定テンプレートを使って、はみがきをやさしく応援する短い絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはみがきできたよ",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a cheerful preschool child with short dark bob hair, wearing mint-green pajamas, holding a colorful toothbrush in a bright clean bathroom, fresh morning or evening light, friendly mirror reflection, recurring shining star motif, encouraging cheerful heroic mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "{childName}の はみがき できたよ",
      openingNarrationTemplate:
        "きょうも はみがきの じかんが やってきました。{childName}は どんなふうに がんばるかな。",
      pages: [
        {
          textTemplate: "{childName}は、きょうもおくちをあーん。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a preschool child standing on a small step stool in a bright, clean bathroom. The child, with short dark hair and mint-green pajamas, reaches for a colorful toothbrush in a cup on the sink counter. A friendly mirror reflects the child's eager face. Toothpaste, a rinse cup, and a hand towel are neatly arranged. A small shining star motif is tucked on the cup or mirror corner. Bright morning light from a window. Soft watercolor picture book style, rounded child-safe shapes, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "しゃかしゃか、こしこし。すこしずつ、おくちがきれいになります。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium action shot of the child with short dark hair and mint-green pajamas actively brushing teeth with hero-like concentration. The child holds the toothbrush with both small hands, mouth slightly open with gentle white foam. A friendly mirror shows the child's focused, determined expression. Soft bubbles float near the sink. A small shining star motif appears on the toothbrush handle. Clean, bright bathroom setting. Soft watercolor picture book style, dynamic but gentle composition, rich but not cluttered."
          ),
          pageVisualRole: "action",
        },
        {
          textTemplate: "おわったあと、{childName}はちょっぴりうれしそうでした。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Close-up of the child's proud, beaming smile after finishing brushing teeth. Sparkling clean teeth visible in a wide grin. The child, in mint-green pajamas, holds up the toothbrush triumphantly like a tiny hero. The mirror behind reflects the happy moment. A small shining star motif glows near the child. Warm encouraging light. Soft watercolor picture book style, celebratory hero-like framing, rich but not cluttered."
          ),
          pageVisualRole: "payoff",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide warm shot of a parent and child together at the bathroom doorway, seen from side view. The child, in mint-green pajamas, holds the parent's hand, looking up with a satisfied smile. The bathroom is tidy behind them. A hallway beckons warmly ahead. A small shining star motif is visible on a doorframe. Soft evening glow. Soft watercolor picture book style, peaceful transition composition, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-first-christmas",
    name: "はじめてのクリスマス",
    description: "家族とのクリスマスの思い出を、やさしく残せる固定テンプレート",
    icon: "🎄",
    categoryGroupId: "seasonal-events",
    creationMode: "fixed_template",
    order: 10,
    active: true,
    systemPrompt: "固定テンプレートを使って、はじめてのクリスマスをやさしく残す絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のはじめてのクリスマス",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a young child celebrating Christmas with family in a cozy living room, soft warm fairy lights, decorated Christmas tree, gentle winter glow, recurring small golden bell motif, festive but calm storybook mood, soft watercolor style, child-safe tender composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "{childName}の はじめての クリスマス",
      openingNarrationTemplate:
        "きらきらの ひかりに つつつまれた よる。{childName}と {familyMembers}の とくべつな クリスマスが はじまります。",
      pages: [
        {
          textTemplate:
            "{childName}は、{familyMembers}といっしょに、きらきらのクリスマスをむかえました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy living room decorated for Christmas. A young child stands near a sparkling Christmas tree, reaching up toward a low ornament with wide amazed eyes. Family members sit nearby on a sofa, smiling warmly. Soft fairy lights drape across the tree and mantle. Wrapped presents rest under the tree. A small golden bell motif hangs on a low branch. Warm candlelight and gentle winter evening tones. Soft watercolor picture book style, festive but calm atmosphere, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "おへやには、やさしいひかりと、うれしいきもちがいっぱいです。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium shot of a festive Christmas room glowing with soft light. Focus on the child kneeling near the tree, carefully examining a shiny ornament or a small wrapped gift. Stockings hang from a mantle. Candles flicker on a side table. Family members are visible in soft focus behind the child. A small golden bell motif is hidden among the ornaments. Warm amber and red holiday tones. Soft watercolor picture book style, wonder-filled composition, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "{childName}のにこにこえがおを見て、みんなもにっこりしました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Close-up of the child's delighted face during Christmas celebration. The child holds a small gift or ornament with both hands near their chest, eyes sparkling with joy. Family members lean in close, sharing the moment with warm smiles. Soft fairy light bokeh in the background. A small golden bell motif is visible on the gift ribbon or nearby. Warm golden and soft white tones. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide scenic shot of a family by a frosty window on Christmas night, viewed from behind. The child sits on a parent's lap, both gazing at softly falling snow outside. The Christmas tree glows gently in the background. A warm blanket drapes over them. A small golden bell motif catches the light near the windowsill. Quiet, magical winter night atmosphere with deep blue and warm gold tones. Soft watercolor picture book style, peaceful memorable finale, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-sharing-friends",
    name: "おともだちとわけっこできたね",
    description: "やさしさと自信を育てる、わけっこテーマの固定テンプレート",
    icon: "🤝",
    categoryGroupId: "emotional-growth",
    creationMode: "fixed_template",
    order: 6,
    active: true,
    systemPrompt:
      "固定テンプレートを使って、わけっこを通してやさしさと自信を育てる短い絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のわけっこできたね",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: two children sharing toys with warm smiles in a bright playroom, one child is the protagonist, gentle sunlight, recurring tiny kindness spark motif, tender emotional-growth mood, soft watercolor style, child-safe rounded composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "{childName}の わけっこ できたね",
      openingNarrationTemplate:
        "きょうは、{childName}が おともだちと すごすなかで、{lessonToTeach}の あたたかさに そっと きづいていく おはなしです。",
      pages: [
        {
          textTemplate: "{childName}は、だいすきなおもちゃであそんでいました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a bright child playroom. The protagonist child sits on a soft rug, holding a favorite toy close with both hands. Shelves with books and plush animals are in the background. A second child is visible nearby, watching with interest. A tiny kindness spark motif appears on a cushion corner. Soft watercolor picture book style, balanced foreground-midground-background composition, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "おともだちが「いっしょにあそびたいな」といいました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium shot showing two children at eye level in a playroom. One child gently asks to join while the protagonist thinks for a moment, still holding the toy. Their facial expressions are soft and thoughtful, not upset. Warm daylight enters from a side window. A tiny kindness spark motif is tucked on a toy box edge. Soft watercolor picture book style, clear emotional storytelling framing, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "{childName}は、にっこりして「いっしょにあそぼ」といいました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Close-up of two children smiling as they share a favorite toy together, hands gently touching the same object. The protagonist's expression shows pride and kindness. Background is softly blurred with warm playroom colors. A tiny kindness spark motif glows near their joined hands. Soft watercolor picture book style, intimate emotional framing, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide quiet ending shot of the two children sitting side by side after playtime, toys neatly shared between them. The room is calm in soft late-afternoon light. The protagonist leans comfortably with a peaceful smile. A tiny kindness spark motif appears near a bookshelf or rug edge. Soft watercolor picture book style, serene reflective composition, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-sleepy-moon-adventure",
    name: "おつきさまと おやすみぼうけん",
    description: "寝る前に安心して眠れる、月あかりの固定テンプレート",
    icon: "🌙",
    categoryGroupId: "bedtime",
    creationMode: "fixed_template",
    order: 11,
    active: true,
    systemPrompt: "固定テンプレートを使って、寝る前の安心感をやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とおつきさまのおやすみぼうけん",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a sleepy child in cozy pajamas looking at a bright moon from a bedroom window, soft blanket draped around shoulders, tiny glowing star motif, calm and reassuring bedtime mood, soft watercolor style, rounded child-safe composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "おつきさまと おやすみぼうけん",
      openingNarrationTemplate:
        "よるのしずかな へやで、{childName}は まどのむこうの おつきさまを みつけました。",
      pages: [
        {
          textTemplate: "ベッドのうえで、{childName}はまどのそとのおつきさまを見つけました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy bedroom at night. A child sits upright on bed under a soft blanket, gazing through a window at a bright round moon. Plush toys and a warm bedside lamp create a secure bedtime atmosphere. A tiny glowing star motif appears near the window curtain. Moonlight and warm lamp light blend softly. Watercolor picture book style, rich but uncluttered composition, child-safe rounded shapes."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "{childName}は、ふわふわの雲やきらきらの星をそうぞうしました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium discovery shot of a child smiling softly on bed while imagining cloud paths and star shapes floating gently around the room like dream symbols. The bedroom remains clear and cozy, with moonlight entering from the window. A small star motif appears among the symbolic floating shapes. Safe, calm pretend atmosphere with no danger elements. Soft watercolor picture book style, dreamy but grounded composition, rich but uncluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "おつきさまが「きょうもだいじょうぶ」と見まもってくれているようでした。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Emotional close-up of a child resting on pillow with peaceful eyes, moonlight softly illuminating the face. The child hugs a blanket edge with comfort. Outside window, the moon appears gentle and protective without human text or symbols. A tiny star motif glows near the pillow seam. Intimate calm framing, watercolor picture book style, warm reassurance and quiet confidence, rich but uncluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide quiet ending shot of the child asleep comfortably in bed under a soft blanket. Moonlight paints gentle silver highlights across the room while warm ambient light remains subtle. Plush toy rests by the child's side. A tiny star motif appears on blanket edge. Serene bedtime stillness, safe and cozy environment, watercolor picture book style, balanced calm composition, rich but uncluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-cardboard-rocket",
    name: "ダンボールロケットでしゅっぱつ",
    description: "ごっこ遊びの想像力をのばす、やさしい固定テンプレート",
    icon: "🚀",
    categoryGroupId: "imagination",
    creationMode: "fixed_template",
    order: 12,
    active: true,
    systemPrompt: "固定テンプレートを使って、安心できる想像の宇宙ごっこ絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のダンボールロケットしゅっぱつ",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a joyful child beside a handmade cardboard rocket in a cozy playroom, symbolic stars and planets floating as imagination motifs, tiny comet motif recurring, safe pretend-adventure mood, soft watercolor style, rounded child-safe composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "ダンボールロケットで しゅっぱつ",
      openingNarrationTemplate:
        "あるひ、{childName}は へやで ダンボールロケットを みつけました。きょうは そうぞうの うちゅうへ しゅっぱつです。",
      pages: [
        {
          textTemplate: "{childName}はへやのすみで、ダンボールロケットを見つけました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy playroom with a handmade cardboard rocket near toy shelves and cushions. A child stands beside the rocket with surprised excitement, one hand touching the cardboard surface. A tiny comet motif appears on a nearby cushion. Warm indoor light and tidy safe environment emphasize pretend play. Watercolor picture book style, clear playroom context, rich but uncluttered composition."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate: "ロケットにのりこんで、{childName}のそうぞうのうちゅうがひろがります。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Discovery medium shot from inside or beside a cardboard rocket cockpit in a playroom. The child pretends to launch, smiling with focused excitement while symbolic stars and orbit lines appear as imagination overlays. The real room remains visible to keep the safe pretend-play context. Tiny comet motif appears near the rocket fin. Watercolor picture book style, dynamic but gentle framing, rich but uncluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "きらきらの星やまるい惑星を見て、{childName}は胸がわくわくしました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Emotional close-up of the child inside the cardboard rocket, face lit by soft imaginative starlight effects. Symbolic planets and stars float around as dreamy overlays while maintaining a safe playful tone. The child's expression shows awe and joy without fear. Tiny comet motif appears near the control panel sticker area without readable text. Watercolor picture book style, intimate excitement framing, rich but uncluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide quiet ending shot of the playroom after pretend adventure. The child sits beside the cardboard rocket with a content smile, looking toward a cozy corner as if planning the next trip. Toys are neatly arranged, evening light is warm and calm. Tiny comet motif appears on the rocket side. Watercolor picture book style, gentle reflective composition, rich but uncluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-rainy-day-puddle",
    name: "あめの日の みずたまり",
    description: "雨の日の小さな発見を、やさしく前向きに描く固定テンプレート",
    icon: "☔",
    categoryGroupId: "daily-life",
    creationMode: "fixed_template",
    order: 13,
    active: true,
    systemPrompt: "固定テンプレートを使って、雨の日でも楽しい発見を見つける絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}とあめの日のみずたまり",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a cheerful child in a bright raincoat standing beside a shimmering puddle on a safe garden path, soft drizzle and gentle umbrella shapes, cozy rainy-day mood, watercolor storybook style, recurring tiny raindrop motif, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "あめの日の みずたまり",
      openingNarrationTemplate:
        "そとは しとしと あめもよう。{childName}は まどのそとに きらりとひかる みずたまりを みつけました。",
      pages: [
        {
          textTemplate:
            "まどのそとには、やさしい雨がふっていました。{childName}は、きらきらのみずたまりを見つけます。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot from inside a cozy home looking toward a rainy garden path through a window. A child stands by the window with curious eyes, noticing a shimmering puddle outside. Soft indoor warm light contrasts with cool rainy daylight outdoors. A tiny raindrop motif appears near the window frame. Child-safe, calm atmosphere with no nearby vehicles and no road hazard context. Watercolor picture book style, layered foreground and background, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate:
            "レインコートをきて、{childName}はそっとそとへでました。みずたまりがまるで宝ものみたいです。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium discovery shot of a child in a raincoat and rain boots standing on a safe garden walkway, gently approaching a puddle while holding an umbrella. Rain droplets create soft rings on water. A tiny raindrop motif is reflected near the puddle edge. The environment is child-safe, peaceful, and away from vehicle traffic or dangerous crossing context. Watercolor picture book style, clear emotional storytelling composition, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate:
            "みずたまりには空と{childName}のえがおがうつって、{childName}はうれしくなりました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Emotional close-up of a child crouching beside a puddle, smiling as reflection shows sky, clouds, and the child face in rippling water. Small raindrops create delicate circles across the reflection. A tiny raindrop motif appears in the reflected light pattern. Gentle rain ambiance, cozy and hopeful mood, child-safe setting. Watercolor picture book style, intimate framing with soft depth, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide quiet ending shot inside a cozy entryway after rain. The child has returned home, placing rain boots neatly by the door and smiling warmly while holding a small umbrella. Soft towel and warm indoor light suggest comfort and calm. A tiny raindrop motif appears on the umbrella handle. Peaceful reflective mood, child-safe home environment, watercolor picture book style, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-little-helper",
    name: "ちいさなおてつだい",
    description: "小さなお手伝いで自己効力感を育てる、家族向け固定テンプレート",
    icon: "🧺",
    categoryGroupId: "growth-support",
    creationMode: "fixed_template",
    order: 14,
    active: true,
    systemPrompt: "固定テンプレートを使って、小さなお手伝いの達成感をやさしく描く絵本を作ります。",
    fixedStory: {
      titleTemplate: "{childName}のちいさなおてつだい",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: a smiling child carrying a small basket of folded towels in a cozy family room, warm family members nearby, gentle gratitude mood, recurring tiny heart-spark motif, watercolor storybook style, child-safe rounded composition, rich but not cluttered details"
      ),
      titleSpreadTextTemplate: "ちいさなおてつだい",
      openingNarrationTemplate:
        "あるひの おうちで、{childName}は みんなの やくにたてる ちいさな おてつだいを さがしはじめました。",
      pages: [
        {
          textTemplate:
            "おうちでは、みんながおかたづけやじゅんびでいそがしそうです。{childName}はそれを見ていました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Establishing wide shot of a cozy family room connected to a safe kitchen area. Family members organize cushions, laundry, and table items while a child watches with interest, ready to help. A tiny heart-spark motif appears on a basket handle. Warm daylight, calm home atmosphere, child-safe environment with no hazardous tools visible. Watercolor picture book style, layered composition, rich but not cluttered."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate:
            "{childName}は、できそうなおてつだいを見つけました。小さなかごをもって、タオルをはこびます。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Medium discovery shot of a child carefully carrying a small basket with folded towels across a cozy room. Family member nearby offers a supportive smile at child eye level. A tiny heart-spark motif appears near the folded towels. Safe simple household task only, with no hazardous tools or heat-source context visible. Watercolor picture book style, clear action framing, warm and encouraging mood, rich but not cluttered."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "「ありがとう」と言われて、{childName}のこころはぽかぽかになりました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Emotional close-up of a child receiving warm thanks from a family member, both smiling with soft eye contact. The child holds an empty basket proudly after helping. A tiny heart-spark motif glows near their hands. Cozy indoor lighting, gentle family connection, and safe environment. Watercolor picture book style, intimate emotional composition, rich but not cluttered."
          ),
          pageVisualRole: "emotional_closeup",
        },
        {
          textTemplate: "{parentMessage}",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Wide quiet ending shot of a calm family room after the helper task is done. The child sits comfortably beside family, smiling with relaxed pride while a tidy basket rests nearby. A tiny heart-spark motif appears on a cushion seam. Warm evening light, peaceful home mood, safe and reassuring composition. Watercolor picture book style, reflective ending framing, rich but not cluttered."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-learning-colors",
    name: "いろの ふしぎ",
    description: "おにわや もりで、いろいろな いろを さがしてみよう。",
    icon: "🎨",
    categoryGroupId: "learning",
    creationMode: "fixed_template",
    order: 100,
    active: true,
    systemPrompt: "Discovering colors in nature with a friendly guide.",
    fixedStory: {
      titleTemplate: "{childName}と いろの ふしぎ",
      titleSpreadTextTemplate: "{childName}と いろの ふしぎ",
      openingNarrationTemplate:
        "きょうは {childName}と いっしょに、おにわや もりで いろいろな いろを さがしてみましょう。",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: A young child standing in a lush garden with many colorful flowers and butterflies. The child looks curious and happy. Soft watercolor style, gentle daylight, warm atmosphere."
      ),
      pages: [
        {
          textTemplate: "まっかな おはな、みーつけた。てんとうむさんも、おなじ あかいろだね。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A close-up view of a vibrant red flower in a garden. A small ladybug with red wings and black spots is perched on a petal. The child is leaning in closely, looking at the flower with wonder. Soft watercolor style, rich red pigments, gentle morning light."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate:
            "みあげると、ひろい そらが あおいろ。ことりさんも、きもちよさそうに とんでいるよ。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A wide view of a clear blue sky with fluffy white clouds. A small blue bird is flying gracefully through the air. The child is looking up at the sky, pointing with one hand. Soft watercolor style, bright blue tones, airy and peaceful composition."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate: "きいろい ちょうちょが ひらひら。たんぽぽも、おひさまみたいに きいろいね。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A meadow with yellow dandelions. A bright yellow butterfly is fluttering near the flowers. The child is gently reaching out toward the butterfly. Soft watercolor style, warm yellow light, playful movement."
          ),
          pageVisualRole: "action",
        },
        {
          textTemplate:
            "みどりの はっぱが、きらきら。いろがいっぱいの しぜんは、とっても きれいだね。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A quiet forest path with lush green leaves glistening in the sunlight. The child is standing amidst the greenery, looking around with a content smile. Soft watercolor style, deep green layers, serene afterglow."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
  {
    templateId: "fixed-world-magical-forest",
    name: "まほうの もり",
    description: "きらきら ひかる まほうの もりで、ふしぎな だいぼうけん。",
    icon: "🪄",
    categoryGroupId: "favorite-worlds",
    creationMode: "fixed_template",
    order: 101,
    active: true,
    systemPrompt: "Exploring a magical forest where trees glow and animals talk.",
    fixedStory: {
      titleTemplate: "{childName}と まほうの もり",
      titleSpreadTextTemplate: "{childName}と まほうの もり",
      openingNarrationTemplate:
        "あるひ、{childName}は ふしぎな もりの いりぐちに つきました。そこは、きらきら ひかる まほうの もりでした。",
      coverImagePromptTemplate: withFixedImagePromptSafety(
        "Picture book cover illustration: A young child standing at the edge of a magical glowing forest. Large ancient trees with luminous leaves and floating magical particles. Friendly small forest creatures peering out. Dreamy fantasy atmosphere, soft watercolor style, enchanted night glow."
      ),
      pages: [
        {
          textTemplate:
            "もりの なかへ すすむと、おはなたちが やさしく わらって、あいさつを してくれました。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: Deep inside a magical forest. Colorful, oversized flowers with gentle smiling faces are blooming along a path. The child is walking slowly, looking at the flowers with a surprised and happy expression. Soft watercolor style, luminous flower petals, enchanted atmosphere."
          ),
          pageVisualRole: "opening_establishing",
        },
        {
          textTemplate:
            "きらきら ひかる はねを もった、ちいさな ようせいさんが あらわれました。「いっしょに あそぼう！」",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A sun-dappled glade in the magical forest. A tiny, shimmering fairy with translucent wings is hovering in front of the child. The child is reaching out a finger toward the fairy, eyes bright with excitement. Soft watercolor style, sparkling fairy dust, magical light effects."
          ),
          pageVisualRole: "discovery",
        },
        {
          textTemplate:
            "ふしぎな いけを みつけました。おみずを のぞくと、きれいな にじいろが ひろがります。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A glowing rainbow-colored pond surrounded by crystal-like rocks and ferns. The child is crouching by the water's edge, looking at their own reflection which is surrounded by swirling rainbow colors. Soft watercolor style, iridescent water surface, mystical forest background."
          ),
          pageVisualRole: "action",
        },
        {
          textTemplate: "まほうの もりは、たのしいことが いっぱい。また こようね、{childName}。",
          imagePromptTemplate: withFixedImagePromptSafety(
            "Setting: A wide shot of the child waving goodbye to the magical forest as they walk back toward a warm, glowing home in the distance. The forest trees are still visible, glowing softly behind the child. Soft watercolor style, peaceful sunset glow, heart-warming ending."
          ),
          pageVisualRole: "quiet_ending",
        },
      ],
    },
  },
];
