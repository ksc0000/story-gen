/**
 * T7-4b: Generate Group B template thumbnail images via OpenAI Images API.
 *
 * Generates 10 template thumbnail WebP candidates to _tmp_t7_template_candidates/.
 * After manual QA, use --promote-all or --promote <id,...> to copy passing
 * images to public/images/templates/*.webp.
 *
 * All images generated at 1024x1536 (2:3 portrait, native gpt-image-1 size).
 * Converted to WebP via sharp (no resize, quality 85).
 * ThemeCard displays at aspect-[3/4]; with object-cover the image loses ~11%
 * top+bottom — mitigated by centering subjects vertically in each prompt.
 *
 * Usage:
 *   $env:OPENAI_API_KEY = "sk-..."
 *   $env:HTTPS_PROXY    = "http://proxy.hq.melco.co.jp:9515/"
 *   node scripts/generate-template-thumbnails.js --dry-run
 *   node scripts/generate-template-thumbnails.js --write
 *   node scripts/generate-template-thumbnails.js --write --thumb animals
 *   node scripts/generate-template-thumbnails.js --promote-all
 *   node scripts/generate-template-thumbnails.js --promote animals,adventure
 *
 * NOTE: Template IDs may contain hyphens (e.g., emotional-growth).
 *       Regex patterns here use [a-z0-9-]+ accordingly.
 *
 * Prerequisites:
 *   npm install sharp (already available at root)
 *   openai package from functions/node_modules
 */

const { createRequire } = require("module");
const { resolve } = require("path");
const { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } = require("fs");

const ROOT = resolve(__dirname, "..");
const TMP_DIR = resolve(ROOT, "_tmp_t7_template_candidates");
const DEST_DIR = resolve(ROOT, "public/images/templates");

const functionsRequire = createRequire(resolve(ROOT, "functions/package.json"));
const OpenAI = functionsRequire("openai").default ?? functionsRequire("openai");
const { HttpsProxyAgent } = require("https-proxy-agent");
const sharp = require("sharp");

// ─── Common visual language ───────────────────────────────────────────────────

const VISUAL_LANGUAGE =
  "Children's picture book illustration style, bright warm inviting colors, rounded friendly shapes, " +
  "soft diffused lighting, portrait orientation with subject centered vertically. " +
  "No readable text, no letters, no signs, no logos, no watermarks anywhere. " +
  "Not photorealistic, not dark, not threatening.";

function buildPrompt(scene) {
  return `${scene} ${VISUAL_LANGUAGE}`;
}

// ─── Thumbnail definitions ────────────────────────────────────────────────────
// Each entry has a unique scene derived from SEED_TEMPLATES.visualDirection.

const THUMBNAILS = [
  {
    id: "animals",
    prompt: buildPrompt(
      "Soft woodland picture-book cover. A fluffy bear, rabbit, fox, and small bird gathered in a sunlit forest clearing, smiling and playing together. " +
      "Warm dappled sunlight filtering through leafy trees, cream-toned background, rounded friendly shapes and gentle smiling faces. Cozy approachable composition."
    ),
  },
  {
    id: "adventure",
    prompt: buildPrompt(
      "Bright adventurous picture-book cover. A small child holding a sparkling golden compass stands on a green hilltop, wide open landscape stretching ahead — rolling hills, blue sky, winding path. " +
      "Dynamic outward-facing pose conveying discovery and joyful safe excitement."
    ),
  },
  {
    id: "fantasy",
    prompt: buildPrompt(
      "Dreamy magical night picture-book cover. A child and a friendly baby dragon stand together under a deep navy starry sky, a glowing wand in the child's hand, floating open books and soft sparkles around them, " +
      "a luminous castle with glowing windows in the background. Gold and navy palette, ornate but child-friendly details."
    ),
  },
  {
    id: "bedtime",
    prompt: buildPrompt(
      "Calm bedtime picture-book cover. A small child in cozy pajamas sits in bed hugging a plush stuffed bear, a smiling crescent moon glowing through the bedroom window with tiny twinkling stars, " +
      "soft warm lamp light beside the bed. Muted blues, slow peaceful composition, sleepy tender mood."
    ),
  },
  {
    id: "emotional-growth",
    prompt: buildPrompt(
      "Warm emotional-growth picture-book cover. Two small children holding hands gently in a golden sunlit flower garden, faces full of warmth and kindness. " +
      "A small glowing heart or seed motif at the center. Soft afternoon light, encouraging and tender mood."
    ),
  },
  {
    id: "daily-habits",
    prompt: buildPrompt(
      "Cheerful daily-habit picture-book cover. A small child brushing teeth alongside a smiling anthropomorphic toothbrush character in a bright clean bathroom. " +
      "Bright primary colors, clear and tidy composition, reassuring parent-child learning mood."
    ),
  },
  {
    id: "educational",
    prompt: buildPrompt(
      "Colorful educational picture-book cover. A child reaching up to floating numbers, colorful shape blocks, and letter motifs in a rainbow-bright magical learning space. " +
      "Small cheerful animal helpers assist. Playful diagram-like clarity, classroom-adventure composition."
    ),
  },
  {
    id: "food",
    prompt: buildPrompt(
      "Warm food picture-book cover. Round smiling bread rolls and cheerful fruit characters gathered in a cozy golden bakery, soft steam rising, gingham cloth on the counter. " +
      "Warm golden-brown lighting, inviting appetizing atmosphere, cute anthropomorphic food designs."
    ),
  },
  {
    id: "seasonal",
    prompt: buildPrompt(
      "Festive seasonal picture-book cover. A vibrant illustration showing all four seasons together: sakura blossoms (spring), sunny beach (summer), golden fallen leaves (autumn), and a snowy snowman scene (winter). " +
      "Bright joyful children in each seasonal vignette. Watercolor-like seasonal color blocks."
    ),
  },
  {
    id: "vehicles-robots",
    prompt: buildPrompt(
      "Pop and exciting vehicles picture-book cover. A friendly smiling robot bus with happy children waving from windows, rolling under a blue sky with white puffy clouds, a clean futuristic city in the background. " +
      "Rounded mechanical shapes, orange and blue accents, energetic safe motion."
    ),
  },
  // ── 新規追加 (2026-06) ──────────────────────────────────────────────────────
  {
    id: "milestone",
    prompt: buildPrompt(
      "Warm milestone memories picture-book cover. A joyful Japanese toddler wearing a tiny graduation cap stands under cherry blossom trees in full bloom, holding a small rolled diploma with both hands. " +
      "Petals drift gently around them, golden morning light, family warmth. Soft pink and cream watercolor palette, tender celebratory mood."
    ),
  },
  {
    id: "learning",
    prompt: buildPrompt(
      "Colorful learning picture-book cover. An eager child sits cross-legged on a cozy rug surrounded by open books, big wooden alphabet blocks, and floating number and shape motifs glowing softly. " +
      "A small owl companion perches nearby. Warm afternoon light, magical educational wonder atmosphere, vivid yellows, blues, and greens."
    ),
  },
  {
    id: "growth",
    prompt: buildPrompt(
      "Inspiring growth picture-book cover. A small child stands on a sunny hilltop with arms raised triumphantly, a tiny lion cub companion beside them as a symbol of courage. " +
      "Gold stars and a rainbow arc gently around both. Warm sunrise horizon, glowing gold and sky-blue palette, sense of achievement and self-confidence."
    ),
  },
  {
    id: "dailylife",
    prompt: buildPrompt(
      "Cozy daily-life picture-book cover. A cheerful child wearing a small apron helps make onigiri rice balls at a warm kitchen table. " +
      "Sunflowers in a vase, morning sunlight through the window, a cat curled nearby. Rich warm yellows and creams, everyday home warmth, inviting family atmosphere."
    ),
  },

  // ── 個別テンプレートサムネイル 42枚 (2026-06) ───────────────────────────────
  // Batch A: 季節行事
  {
    id: "fixed-cherry-blossom",
    prompt: buildPrompt(
      "Cherry blossom picture-book cover. A beaming child sits under a magnificent cherry blossom tree in full bloom, pink petals drifting like snow all around. " +
      "Picnic blanket, bento box, soft spring breeze. Pastel pink and cream palette, gentle spring joy."
    ),
  },
  {
    id: "fixed-hinamatsuri",
    prompt: buildPrompt(
      "Hinamatsuri picture-book cover. A delighted girl in a beautiful floral kimono gazes up at a tiered display of ornate hina dolls — emperor, empress, and attendants in red and gold. " +
      "Peach blossoms and diamond-shaped rice cakes. Elegant soft pinks and golds, traditional festive mood."
    ),
  },
  {
    id: "fixed-childrens-day",
    prompt: buildPrompt(
      "Children's Day picture-book cover. A proud boy wearing a samurai kabuto helmet holds a golden koi nobori streamer, colorful carp kites flying high in a bright blue sky above a lush hill. " +
      "Iris flowers below, energetic blue and green palette, celebratory outdoor freedom."
    ),
  },
  {
    id: "fixed-tanabata",
    prompt: buildPrompt(
      "Tanabata star festival picture-book cover. A child reaches up to hang a colorful tanzaku wish paper on a tall bamboo branch under a deep indigo summer night sky full of stars. " +
      "The Milky Way glows above, paper decorations flutter. Navy and gold star palette, magical wishing mood."
    ),
  },
  {
    id: "fixed-summer-festival",
    prompt: buildPrompt(
      "Summer festival picture-book cover. A happy child in a bright yukata holds a goldfish scooping net at a festive yatai stall, colorful paper lanterns glowing orange above a lively festival street. " +
      "Cotton candy, watermelon, cheerful crowds in the background. Warm orange and red lantern glow, festive summer excitement."
    ),
  },
  {
    id: "fixed-fireworks",
    prompt: buildPrompt(
      "Fireworks picture-book cover. A child in a yukata looks up with wide shining eyes as enormous colorful fireworks burst across a deep navy night sky over a river. " +
      "Gold and red reflections shimmer on the water below. Dramatic navy and gold palette, sense of wonder and magic."
    ),
  },
  {
    id: "fixed-halloween",
    prompt: buildPrompt(
      "Halloween picture-book cover. A cheerful child dressed as a friendly ghost with a glowing jack-o-lantern candy bucket walks a path through a whimsical autumn neighborhood. " +
      "Smiling pumpkins, orange leaves, a crescent moon. Warm orange and purple palette, cute spooky not scary."
    ),
  },
  {
    id: "fixed-new-year",
    prompt: buildPrompt(
      "New Year picture-book cover. A child in a beautiful new kimono makes a formal bow at a shrine gate under brilliant morning light, a red-white kagami mochi and pine-bamboo-plum decoration nearby. " +
      "Red torii, white snow dusting, golden sunrise. Traditional red, white, and gold palette, fresh hopeful new year joy."
    ),
  },

  // Batch B: 思い出・記念
  {
    id: "fixed-first-nursery",
    prompt: buildPrompt(
      "First day of nursery school picture-book cover. A tiny child in a little school smock clutches a small randoseru backpack and waves bravely goodbye from a colorful classroom doorway. " +
      "Crayons and picture books visible inside, morning light streaming in. Soft pastels, gentle brave first-step mood."
    ),
  },
  {
    id: "fixed-first-elementary",
    prompt: buildPrompt(
      "First day of elementary school picture-book cover. A proud child in a new uniform stands tall with a bright red randoseru backpack under cherry blossoms, school gate behind them. " +
      "Yellow safety hat, big smile. Cherry blossom pink and spring green, milestone celebration mood."
    ),
  },
  {
    id: "fixed-new-sibling",
    prompt: buildPrompt(
      "New baby sibling picture-book cover. An older child gently leans in to look at a tiny sleeping newborn in a soft crib, face full of tender wonder and love. " +
      "Soft nursery light, pastel mobile above. Cream and lavender palette, tender sibling bond mood."
    ),
  },
  {
    id: "fixed-first-airplane",
    prompt: buildPrompt(
      "First airplane ride picture-book cover. A child presses their face excitedly against an airplane window, clouds floating past outside, a small toy plane in hand. " +
      "Interior warm cabin light, blue sky and cotton clouds beyond. Sky blue and warm yellow, adventurous first-flight wonder."
    ),
  },
  {
    id: "fixed-first-sports-day",
    prompt: buildPrompt(
      "Sports day picture-book cover. A child races with full effort at a colorful school sports day, arms pumping, red and white team flags flying, cheering crowd of families watching. " +
      "Blue sky, outdoor athletic energy. Red, white, and blue sporty palette, determined joyful effort."
    ),
  },
  {
    id: "fixed-first-recital",
    prompt: buildPrompt(
      "First recital picture-book cover. A child in a sparkly costume stands center stage under warm spotlights, mid-performance — a proud confident moment, audience just visible in the dark below. " +
      "Stage curtains of deep red, golden spotlight. Red and gold stage palette, shining performance pride."
    ),
  },
  {
    id: "fixed-growing-taller",
    prompt: buildPrompt(
      "Growing taller picture-book cover. A child stands straight and tall against a door frame while a parent lovingly marks their height with a pencil, both smiling. " +
      "Height marks going up the frame, warm home hallway. Warm cream and soft green, cozy milestone home mood."
    ),
  },

  // Batch C: まなび
  {
    id: "fixed-learning-colors",
    prompt: buildPrompt(
      "Learning colors picture-book cover. A child sits surrounded by floating paint splashes of red, yellow, blue, green, and purple, each color a glowing bubble. " +
      "A friendly paintbrush character nearby. Vivid rainbow palette, joyful color exploration wonder."
    ),
  },
  {
    id: "fixed-learning-numbers",
    prompt: buildPrompt(
      "Learning numbers picture-book cover. A child reaches up to touch large friendly floating numbers 1 through 10 glowing like stars, each a different warm color. " +
      "Small animal helpers count along. Warm yellows and blues, playful numerical discovery."
    ),
  },
  {
    id: "fixed-learning-animals",
    prompt: buildPrompt(
      "Learning animals picture-book cover. A delighted child sits in a circle of friendly animals — a bear, rabbit, elephant, lion, and duck — each introducing themselves. " +
      "Lush green meadow background. Rich natural greens and warm tones, cheerful animal friends gathering."
    ),
  },
  {
    id: "fixed-learning-seasons",
    prompt: buildPrompt(
      "Learning seasons picture-book cover. A child stands at the center of four seasonal quadrants — spring cherry blossoms, summer sunflowers, autumn maple leaves, winter snowflakes — arms wide open. " +
      "Each season blooms from the child outward. Four-season palette, joyful seasonal discovery."
    ),
  },
  {
    id: "fixed-learning-shapes",
    prompt: buildPrompt(
      "Learning shapes picture-book cover. A child builds a little house out of giant colorful geometric shapes — a triangle roof, square door, circle window — cheerful shape characters watching. " +
      "Bright primary colors, playful construction scene, creative wonder."
    ),
  },

  // Batch D: ファンタジー
  {
    id: "fixed-world-magical-forest",
    prompt: buildPrompt(
      "Magical forest picture-book cover. A child steps through a glowing arch of ancient trees into an enchanted forest where fireflies, luminous mushrooms, and friendly woodland spirits glow. " +
      "Deep greens and golds with soft magical light, mysterious but welcoming wonder."
    ),
  },
  {
    id: "fixed-world-underwater",
    prompt: buildPrompt(
      "Underwater world picture-book cover. A child swims gracefully through a vibrant coral reef, surrounded by colorful tropical fish, gentle sea turtles, and a friendly whale in the distance. " +
      "Sunlight filters from above through clear blue water. Aqua blue and coral palette, serene underwater wonder."
    ),
  },
  {
    id: "fixed-world-dinosaurs",
    prompt: buildPrompt(
      "Dinosaur world picture-book cover. A brave child rides on the back of a friendly gentle brontosaurus through a lush prehistoric jungle, other cheerful dinosaurs watching from the ferns. " +
      "Volcanoes in the distance, ancient ferns and palms. Rich greens and warm earth tones, thrilling prehistoric adventure."
    ),
  },
  {
    id: "fixed-world-candy-land",
    prompt: buildPrompt(
      "Candy land picture-book cover. A joyful child stands in an incredible land of candy — lollipop trees, chocolate rivers, gingerbread houses, cotton candy clouds. " +
      "Everything is edible and colorful. Vivid pastel rainbow palette, pure sugary delight and wonder."
    ),
  },
  {
    id: "fixed-world-cloud-castle",
    prompt: buildPrompt(
      "Cloud castle picture-book cover. A child floats up on a fluffy cloud toward a magnificent white castle perched among the clouds, rainbow bridges connecting towers, friendly sky creatures waving. " +
      "Sunbeams break through the clouds. Soft white and sky blue with gold accents, dreamy skyward adventure."
    ),
  },
  {
    id: "fixed-world-toy-land",
    prompt: buildPrompt(
      "Toy land picture-book cover. A child walks through a magical town built entirely of toys — teddy bear houses, toy train roads, building block buildings all come to life. " +
      "Wooden toys, plush animals, and tin robots wave hello. Primary colors and wood tones, warm playful magic."
    ),
  },

  // Batch E: 成長サポート
  {
    id: "fixed-potty-training",
    prompt: buildPrompt(
      "Potty training picture-book cover. A small triumphant child stands in a bright cheerful bathroom doorway, arms raised in victory, a beautiful rainbow glowing behind them. " +
      "Warm encouraging home atmosphere. Rainbow colors on cream background, proud milestone achievement."
    ),
  },
  {
    id: "fixed-getting-dressed",
    prompt: buildPrompt(
      "Getting dressed picture-book cover. A proud child stands in front of a bedroom mirror wearing their self-chosen colorful outfit, yellow buttons gleaming on the shirt, arms out with a big smile. " +
      "Cozy morning bedroom, clothes on the floor around them. Warm morning yellows, cheerful independent self-care."
    ),
  },
  {
    id: "fixed-eating-veggies",
    prompt: buildPrompt(
      "Eating vegetables picture-book cover. A brave child opens wide to eat a piece of broccoli, while friendly smiling vegetable characters — carrot, peas, broccoli — cheer from the plate. " +
      "Bright kitchen table, warm encouraging mealtime. Rich greens and orange, playful food-adventure courage."
    ),
  },
  {
    id: "fixed-morning-routine",
    prompt: buildPrompt(
      "Morning routine picture-book cover. A bright-eyed child stands ready at the front door in their school outfit, backpack on, waving goodbye with a confident grin. " +
      "A glowing sunrise through the door window. Golden morning light and warm home tones, proud independent morning energy."
    ),
  },
  {
    id: "fixed-chopsticks",
    prompt: buildPrompt(
      "Using chopsticks picture-book cover. A child holds chopsticks with perfect grip, triumphantly lifting a shiny red bean, expression of pure proud surprise. " +
      "Warm dining table with a bowl of food, red bean motifs scattered like confetti. Warm wood and red tones, chopstick mastery joy."
    ),
  },
  {
    id: "fixed-first-friend",
    prompt: buildPrompt(
      "First friend picture-book cover. Two children hold hands warmly in a sunny park, both beaming at each other, heart motifs floating around them like soap bubbles. " +
      "Green grass, flowers, golden afternoon light. Warm soft pinks and greens, tender first friendship bloom."
    ),
  },
  {
    id: "fixed-being-brave",
    prompt: buildPrompt(
      "Being brave picture-book cover. A small child and a tiny lion cub companion stand side by side on a hilltop at sunrise, both looking forward bravely. " +
      "Gold star motifs float around them, warm sunrise glow. Gold and sky blue palette, courageous adventurous spirit."
    ),
  },
  {
    id: "fixed-saying-sorry",
    prompt: buildPrompt(
      "Saying sorry picture-book cover. Two children face each other — one extending a hand in apology, the other beginning to smile in forgiveness — a beautiful rainbow arching over them both. " +
      "Soft park setting, warm afternoon light. Rainbow palette on cream, tender reconciliation warmth."
    ),
  },

  // Batch F: 日常・思い出
  {
    id: "fixed-first-snow",
    prompt: buildPrompt(
      "First snow picture-book cover. A tiny toddler in a puffy snowsuit reaches both mittened hands up to catch snowflakes, eyes wide with magical wonder, standing in a white snowy garden. " +
      "Snowflake crystals sparkle everywhere. Soft blue-white palette, pure magical winter wonder."
    ),
  },
  {
    id: "fixed-autumn-leaves",
    prompt: buildPrompt(
      "Autumn leaves walk picture-book cover. A child walks through a tunnel of blazing red and gold maple trees, arms outstretched, leaves raining down all around. " +
      "A perfect red maple leaf held up in one hand. Rich crimson, gold, and amber palette, joyful autumn sensory delight."
    ),
  },
  {
    id: "fixed-insect-hunt",
    prompt: buildPrompt(
      "Insect hunt picture-book cover. An excited child holds up a green bug cage examining a captured grasshopper inside, surrounded by tall summer grass full of cheerful insects. " +
      "Bright summer sky, vivid greens. Rich summer green and blue, thrilling nature explorer mood."
    ),
  },
  {
    id: "fixed-flower-garden",
    prompt: buildPrompt(
      "Flower garden picture-book cover. A delighted child stands among towering sunflowers in a dazzling summer flower garden, arms spread wide, face turned up to the sun. " +
      "Sunflowers taller than the child on all sides. Vivid golden yellow and green, joyful sunflower abundance."
    ),
  },
  {
    id: "fixed-making-onigiri",
    prompt: buildPrompt(
      "Making onigiri picture-book cover. A child holds up a perfectly shaped triangle onigiri with both hands, beaming with pride, nori seaweed wrapping the bottom. " +
      "Warm kitchen table, rice bowl nearby. Warm white, cream, and nori green, proud cooking achievement."
    ),
  },
  {
    id: "fixed-fruit-picking",
    prompt: buildPrompt(
      "Fruit picking picture-book cover. A joyful child reaches up to pick a large shiny red apple from an apple tree in a sunlit orchard, the branch bending down to meet them. " +
      "Red apples hanging everywhere, warm harvest light. Vivid red and green orchard palette, harvest joy."
    ),
  },
  {
    id: "fixed-first-swimming",
    prompt: buildPrompt(
      "First swimming picture-book cover. A laughing child splashes joyfully in a sparkling blue pool, arms wide, water droplets catching the sunlight like diamonds around them. " +
      "Blue bubbles float up, summer sky above. Bright aqua blue and summer white, pure water play joy."
    ),
  },
  {
    id: "fixed-first-bike",
    prompt: buildPrompt(
      "First bicycle ride picture-book cover. A child cycles solo on a bicycle for the first time, mouth open in a shout of triumph, hair streaming behind, pinwheel windmills spinning in their wake. " +
      "Sunny outdoor path stretching ahead. Bright sky blue and warm yellow, sense of speed and newfound freedom."
    ),
  },

  // ── Old fixed templates that previously shared category images ────────────
  {
    id: "fixed-first-zoo",
    prompt: buildPrompt(
      "First trip to the zoo picture-book cover. A young child stands at a text-free decorative zoo entrance arch adorned with animal-shaped decorations, looking up with wide excited eyes. " +
      "Family members walk beside the child along a tree-lined path. Friendly giraffe or elephant visible in the background. " +
      "Warm golden morning daylight, welcoming zoo atmosphere, small yellow star motif tucked into the arch. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-first-birthday",
    prompt: buildPrompt(
      "First birthday celebration picture-book cover. A young child sits in front of a small birthday cake glowing with one candle, family gathered close with warm smiles. " +
      "Soft indoor light, pastel balloons floating above, tiny ribbon motif woven into the scene. " +
      "Tender keepsake-photo mood, warm golden tones, joy and love filling the room. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-brush-teeth",
    prompt: buildPrompt(
      "Toothbrushing bedtime picture-book cover. A cheerful preschool child with a short dark bob, wearing mint-green pajamas, stands on a small step stool at a bright clean bathroom sink, " +
      "holding a colorful toothbrush triumphantly and smiling at the mirror. A friendly star motif gleams on the mirror corner. " +
      "Encouraging hero-moment mood, bright bathroom light, fresh and clean feeling. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-first-christmas",
    prompt: buildPrompt(
      "First Christmas picture-book cover. A young child in a cozy living room decorated for Christmas, reaching up toward a sparkling Christmas tree with wide amazed eyes. " +
      "Family members sit nearby on a sofa smiling warmly. Soft fairy lights drape across the tree, wrapped presents under it, a small golden bell motif hanging on a low branch. " +
      "Warm winter glow, festive but calm mood. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-sharing-friends",
    prompt: buildPrompt(
      "Sharing and kindness picture-book cover. Two children in a bright sunny playroom share a favorite toy with warm smiles, hands gently touching the same object. " +
      "One child is the generous protagonist, both expressions show joy and pride. Tiny kindness spark motif near their joined hands. " +
      "Emotional warmth, soft afternoon light through a window. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-sleepy-moon-adventure",
    prompt: buildPrompt(
      "Bedtime moon adventure picture-book cover. A sleepy child in cozy star-print pajamas sits on their bed gazing at a bright full moon through a bedroom window, " +
      "a fluffy blanket draped around their shoulders and a soft plush bunny tucked beside them. Tiny glowing star motifs float gently near the window. " +
      "Calm and reassuring nighttime mood, soft moonlight washing over the room. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-rainy-day-puddle",
    prompt: buildPrompt(
      "Rainy day puddle discovery picture-book cover. A cheerful child in a bright yellow raincoat and red rain boots stands delightedly beside a large shimmering puddle on a garden path, " +
      "arms spread wide with excitement, soft drizzle and a colorful umbrella nearby. " +
      "Cozy after-rain mood, glistening reflections, warm home visible through a window in the background. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-little-helper",
    prompt: buildPrompt(
      "Little helper picture-book cover. A smiling child carefully carries a small basket of neatly folded towels across a cozy family room, arms slightly outstretched for balance. " +
      "A family member nearby looks on with a warm grateful smile. Tiny heart-spark motif on the basket handle. " +
      "Confidence-building helper mood, soft warm daylight, safe everyday home setting. Soft watercolor style, rich but not cluttered."
    ),
  },

  // ── Remaining templates still using shared category images (2026-06) ────────
  // 8-page variants reuse their 4-page sibling's image via wiring; only base prompts here.
  {
    id: "fixed-birthday-4p",
    prompt: buildPrompt(
      "Happy birthday picture-book cover. A beaming child stands beside a delicious birthday cake glowing with candles, colorful balloons and streamers filling a warm festive room, smiling family just behind. " +
      "A small star motif tucked among the decorations. Joyful celebratory mood, warm golden party light. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-bedtime-good-day",
    prompt: buildPrompt(
      "Calm 'what a good day' bedtime picture-book cover. A content child snuggles under a cozy blanket in bed, eyes softly closing, a gentle smile of a day well spent, warm lamp glow and a plush toy nearby. " +
      "Tiny floating dream motifs of the day's happy moments above the bed. Muted warm blues, peaceful reassuring nighttime mood. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-cardboard-rocket",
    prompt: buildPrompt(
      "Cardboard rocket pretend-play picture-book cover. An imaginative child sits inside a hand-made cardboard rocket decorated with a big crayon star, arms raised mid-blast-off, a cozy living room transforming into a starry imaginary space around them. " +
      "Soft drawn stars and planets float in the air. Warm browns with magical blue accents, playful imaginative wonder. Soft watercolor style, rich but not cluttered."
    ),
  },

  // Batch G: ギフト (PR #337)
  {
    id: "fixed-graduation-kindergarten",
    prompt: buildPrompt(
      "Kindergarten graduation picture-book cover. A proud child in a tiny graduation cap holds a small rolled certificate with both hands, standing under cherry blossom trees in full bloom, the kindergarten building softly behind. " +
      "Petals drift gently, warm spring morning light. Soft pink and cream palette, accomplished tender new-beginning mood. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-entrance-elementary",
    prompt: buildPrompt(
      "Elementary school entrance picture-book cover. An excited child wearing a bright red randoseru backpack and a yellow safety hat stands tall at a school gate under blooming cherry blossoms, new friends waving nearby. " +
      "Spring green and cherry-blossom pink, energetic hopeful first-grader mood. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-new-baby",
    prompt: buildPrompt(
      "New baby sibling picture-book cover. A gentle older child leans tenderly over a tiny sleeping newborn wrapped in a soft blanket, face full of loving wonder, a pastel nursery mobile turning softly above. " +
      "Cream and lavender palette, warm tender sibling-love mood. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-first-steps",
    prompt: buildPrompt(
      "First challenge picture-book cover. A determined child takes a triumphant brave step forward with arms out and a joyful proud expression, a warm encouraging glow and tiny gold star motifs around them. " +
      "Bright uplifting palette, focus on effort and the joy of achievement. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-thank-you-grandparent",
    prompt: buildPrompt(
      "Thank-you-to-grandparents picture-book cover. A child warmly hugs a smiling grandmother and grandfather in a cozy sunlit room, a small hand-drawn heart card held out, gentle nostalgic golden light around them. " +
      "Warm amber and cream palette, deep intergenerational love and gratitude. Soft watercolor style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-moving-farewell",
    prompt: buildPrompt(
      "Farewell-to-a-friend picture-book cover. Two children share a warm goodbye hug beneath a soft spring or autumn sky, one with a small moving box nearby, a gentle rainbow or trail of petals connecting them. " +
      "Bittersweet but hopeful mood, soft warm light, strong bond of lasting friendship. Soft watercolor style, rich but not cluttered."
    ),
  },

  // ── 名作プリセット第2弾 10枚 (2026-06-26) ───────────────────────────────────
  // むかしばなし・名作（PD再話）。各テンプレの visualDirection に対応。お子さまが主人公。
  {
    id: "fixed-classic-issunboshi",
    prompt: buildPrompt(
      "Issun-boshi (One-Inch Boy) picture-book cover. A brave tiny child the size of a thumb stands proudly in a wooden rice bowl boat, using a sewing-needle sword and a chopstick oar, floating down a sparkling river toward a traditional Japanese town. " +
      "Warm encouraging mood, recurring tiny rice-grain motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-omusubi",
    prompt: buildPrompt(
      "Omusubi-kororin (The Rolling Rice Ball) picture-book cover. A cheerful kind child watches a round rice ball roll into a small hole at the foot of a grassy hill, friendly little mice peeking out happily from inside. " +
      "Sunny gentle countryside, warm kindness-and-wonder mood, recurring tiny rice-ball motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-crane",
    prompt: buildPrompt(
      "Tsuru-no-ongaeshi (The Grateful Crane) picture-book cover. A gentle child kindly frees a beautiful white crane from a snowy field, the graceful bird spreading its wings in gratitude, soft snow falling around them. " +
      "Tender quiet mood, cool whites and warm accents, recurring tiny feather motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-three-pigs",
    prompt: buildPrompt(
      "Three Little Pigs picture-book cover. A diligent smiling child happily builds a sturdy little brick house with a trowel, two friendly piglet friends nearby beside straw and stick houses, a gentle comical wolf peeking harmlessly from behind a tree. " +
      "Cheerful diligence-and-preparation mood, recurring tiny brick motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-mitten",
    prompt: buildPrompt(
      "The Mitten picture-book cover. A warm-hearted child kneels beside a big cozy knitted mitten in the snow, friendly small animals — a mouse, a rabbit, and a fox — snuggling inside together sharing warmth. " +
      "Soft snowy winter, tender sharing mood, recurring tiny snowflake motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-ant-grasshopper",
    prompt: buildPrompt(
      "The Ant and the Grasshopper picture-book cover. A diligent child carries a basket of food like a busy ant along a sunny summer meadow path, a cheerful grasshopper playing a little fiddle nearby in the tall grass. " +
      "Warm preparation-and-kindness mood, recurring tiny wheat-grain motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-golden-goose",
    prompt: buildPrompt(
      "The Golden Goose picture-book cover. A kind smiling child gently carries a softly shining golden goose, a funny little chain of cheerful people comically stuck together following behind in playful poses. " +
      "Warm whimsical humorous mood, recurring tiny golden-feather motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-bremen",
    prompt: buildPrompt(
      "The Bremen Town Musicians picture-book cover. A cheerful child leads a happy band of friendly animals — a donkey, a dog, a cat, and a rooster — ready to make music together on a sunny road. " +
      "Warm teamwork-and-friendship mood, recurring tiny music-note motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  // 創作（成長を応援）。完全オリジナル。
  {
    id: "fixed-tiny-seed-big-tree",
    prompt: buildPrompt(
      "Original growth tale picture-book cover. A hopeful child kneels beside a tiny green sprout in soft soil, gently holding a small watering can, a faint dreamy silhouette of a great leafy tree rising behind them. " +
      "Warm patience-and-growth mood, recurring tiny green-leaf motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-little-train-hill",
    prompt: buildPrompt(
      "Original perseverance tale picture-book cover. A cheerful child as the driver of a small friendly train loaded with colorful toys, starting up a steep green hill with a determined hopeful smile. " +
      "Warm perseverance-and-kindness mood, recurring tiny puff-of-steam motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },

  // ── 名作プリセット第1弾 5枚 (PR #626・画像未生成のため追加) ─────────────────
  {
    id: "fixed-classic-big-turnip",
    prompt: buildPrompt(
      "The Giant Turnip (Ookina Kabu) picture-book cover. A cheerful child pulls hard on the leafy top of an enormous turnip in a sunny vegetable garden, friendly helpers — a grandfather, a dog, a cat, and a little mouse — lined up behind, all heaving together with happy effort. " +
      "Warm teamwork-and-perseverance mood, recurring tiny leaf motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-tortoise-hare",
    prompt: buildPrompt(
      "The Tortoise and the Hare picture-book cover. A steady smiling child walks the race path beside a gentle slow tortoise, a friendly hare napping under a tree in the background, a grassy hill course winding ahead under a bright sky. " +
      "Warm steady-effort mood, recurring tiny clover motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-momotaro",
    prompt: buildPrompt(
      "Momotaro (Peach Boy) picture-book cover. A brave kind child stands cheerfully with a small banner and millet dumplings, three friendly animal companions — a dog, a monkey, and a pheasant — gathered happily beside them, a giant peach and a soft blue sky behind. " +
      "Warm courage-and-friendship mood, no violence, recurring tiny peach motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-classic-kasajizo",
    prompt: buildPrompt(
      "Kasa-jizo (The Straw-Hat Jizo) picture-book cover. A warm-hearted child gently places woven straw hats on a row of small stone Jizo statues standing in soft falling snow, snow caps melting away under the kind gesture. " +
      "Tender quiet kindness mood, snowy evening light, recurring tiny snowflake motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
  {
    id: "fixed-goodnight-everyone",
    prompt: buildPrompt(
      "Goodnight to Everyone bedtime picture-book cover. A sleepy smiling child in cozy pajamas waves goodnight from bed to gentle friends — a moon, a star, a teddy bear, and a little bird on the windowsill — soft warm lamp light and a calm navy night sky. " +
      "Peaceful tender bedtime mood, recurring tiny star motif, soft watercolor storybook style, rich but not cluttered."
    ),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isWrite = args.includes("--write");
  const isPromoteAll = args.includes("--promote-all");
  const promoteIdx = args.indexOf("--promote");
  const promoteIds = promoteIdx !== -1 ? args[promoteIdx + 1].split(",").map((s) => s.trim()) : [];
  const thumbIdx = args.indexOf("--thumb");
  // --thumb accepts comma-separated ids: --thumb fixed-cherry-blossom,fixed-hinamatsuri
  const thumbFilter = thumbIdx !== -1 ? args[thumbIdx + 1].split(",").map((s) => s.trim()) : null;

  const isPromote = isPromoteAll || promoteIds.length > 0;

  if (!isDryRun && !isWrite && !isPromote) {
    console.error(
      "Usage:\n" +
        "  node scripts/generate-template-thumbnails.js --dry-run\n" +
        "  node scripts/generate-template-thumbnails.js --write [--thumb <id>]\n" +
        "  node scripts/generate-template-thumbnails.js --promote-all\n" +
        "  node scripts/generate-template-thumbnails.js --promote <id1,id2,...>"
    );
    process.exit(1);
  }

  // ── Promote mode ──────────────────────────────────────────────────────────
  if (isPromote) {
    if (!existsSync(TMP_DIR)) {
      console.error(`[error] Candidate directory not found: ${TMP_DIR}`);
      console.error("Run --write first to generate candidates.");
      process.exit(1);
    }

    const toPromote = isPromoteAll
      ? THUMBNAILS.map((t) => t.id)
      : promoteIds;

    console.log(`[PROMOTE] Promoting ${toPromote.length} thumbnail(s) to public/images/templates/`);
    if (!existsSync(DEST_DIR)) {
      mkdirSync(DEST_DIR, { recursive: true });
    }

    let successCount = 0;
    for (const id of toPromote) {
      const srcFile = `${id}.webp`;
      const srcPath = resolve(TMP_DIR, srcFile);
      const destPath = resolve(DEST_DIR, srcFile);
      if (!existsSync(srcPath)) {
        console.error(`  [MISSING] ${srcFile} — not found in ${TMP_DIR}`);
        continue;
      }
      copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${id} → public/images/templates/${srcFile}`);
      successCount++;
    }
    console.log(`\nPromoted ${successCount}/${toPromote.length} files.`);

    // Summary: count WebP vs PNG remaining
    const allFiles = readdirSync(DEST_DIR);
    const webpCount = allFiles.filter((f) => f.endsWith(".webp")).length;
    const pngRemaining = allFiles.filter((f) => f.endsWith(".png")).length;
    console.log(`\n[public/images/templates/] webp=${webpCount}  png_remaining=${pngRemaining}`);
    return;
  }

  // ── Dry-run / Write mode ──────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[error] OPENAI_API_KEY is not set.");
    process.exit(1);
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  if (proxyUrl) {
    console.log(`[proxy] Using ${proxyUrl}`);
  }

  const client = new OpenAI({
    apiKey,
    ...(httpAgent ? { httpAgent } : {}),
  });

  const targets = thumbFilter
    ? THUMBNAILS.filter((t) => thumbFilter.includes(t.id))
    : THUMBNAILS;

  if (targets.length === 0) {
    console.error(`[error] No thumbnails found for ids: ${thumbFilter?.join(",")}`);
    process.exit(1);
  }

  console.log(`[${isDryRun ? "DRY-RUN" : "WRITE"}] T7-4b: Generate ${targets.length} template thumbnail(s)`);
  if (isWrite) {
    console.log(`[output] → ${TMP_DIR}`);
  }
  console.log();

  if (isWrite && !existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const results = [];

  for (const thumb of targets) {
    const outPath = resolve(TMP_DIR, `${thumb.id}.webp`);

    console.log(`  [${thumb.id}]`);
    console.log(`    prompt: ${thumb.prompt.slice(0, 120)}...`);

    if (isDryRun) {
      console.log(`    [DRY-RUN] Would generate to _tmp_t7_template_candidates/${thumb.id}.webp`);
      console.log();
      continue;
    }

    // Generate via OpenAI Images API
    console.log(`    Calling OpenAI (gpt-image-1, 1024×1536)...`);
    let imageBuffer;
    try {
      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: thumb.prompt,
        n: 1,
        size: "1024x1536",
        output_format: "png",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No b64_json in response");
      }
      imageBuffer = Buffer.from(b64, "base64");
      console.log(`    Generated (${Math.round(imageBuffer.length / 1024)} KB raw PNG).`);
    } catch (err) {
      console.error(`    [ERROR] Generation failed for ${thumb.id}: ${err.message}`);
      results.push({ id: thumb.id, status: "error", error: err.message });
      continue;
    }

    // Convert to WebP via sharp (no resize — 1024×1536 as generated)
    let webpBuffer;
    try {
      webpBuffer = await sharp(imageBuffer)
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      const meta = await sharp(webpBuffer).metadata();
      console.log(
        `    WebP: ${Math.round(webpBuffer.length / 1024)} KB, ${meta.width}×${meta.height}`
      );
    } catch (err) {
      console.error(`    [ERROR] sharp processing failed for ${thumb.id}: ${err.message}`);
      results.push({ id: thumb.id, status: "error", error: err.message });
      continue;
    }

    // Write to tmp dir
    writeFileSync(outPath, webpBuffer);
    console.log(`    ✓ Written: _tmp_t7_template_candidates/${thumb.id}.webp`);
    results.push({ id: thumb.id, status: "ok", kbSize: Math.round(webpBuffer.length / 1024) });
    console.log();
  }

  if (isWrite) {
    console.log("─".repeat(60));
    console.log("Generation summary:");
    for (const r of results) {
      if (r.status === "ok") {
        console.log(`  ✓ ${r.id}  ${r.kbSize} KB`);
      } else {
        console.log(`  ✗ ${r.id}  ERROR: ${r.error}`);
      }
    }
    const ok = results.filter((r) => r.status === "ok").length;
    console.log(`\n${ok}/${results.length} thumbnails generated to ${TMP_DIR}`);
    console.log("Next: visually QA all images, then run --promote-all or --promote <ids>");
  } else {
    console.log("[DRY-RUN] No files written. Re-run with --write to generate.");
  }
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
