/// <reference types="firebase-admin" />

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "failed";
export type PageStatus = "pending" | "generating" | "completed" | "failed";
export type CreationMode = "fixed_template" | "guided_ai" | "original_ai";
export type PriceTier = "ume" | "take" | "matsu";
export type StoryCostLevel = "none" | "low" | "standard";
export type ProductPlan = "free" | "light_paid" | "standard_paid" | "premium_paid";
export type ImageQualityTier = "light" | "standard" | "premium";
export type CharacterConsistencyMode = "cover_only" | "key_pages" | "all_pages";
export type ImageModelProfile =
  | "klein_fast"
  | "klein_base"
  | "pro_consistent"
  | "kontext_reference";
export type AgeBand =
  | "baby_toddler"
  | "preschool_3_4"
  | "early_reader_5_6"
  | "early_elementary_7_8"
  | "general_child";
export type PageVisualRole =
  | "opening_establishing"
  | "discovery"
  | "action"
  | "emotional_closeup"
  | "object_detail"
  | "setback_or_question"
  | "payoff"
  | "quiet_ending";
export const PAGE_VISUAL_ROLES = [
  "opening_establishing",
  "discovery",
  "action",
  "emotional_closeup",
  "object_detail",
  "setback_or_question",
  "payoff",
  "quiet_ending",
] as const;
export type StoryCharacterRole =
  | "protagonist"
  | "buddy"
  | "parent"
  | "sibling"
  | "animal"
  | "magical_friend"
  | "object_character"
  | "background_recurring";
export type ImagePurpose =
  | "book_page"
  | "book_cover"
  | "child_avatar"
  | "child_avatar_revision"
  | "memory_key_page";
export type IllustrationStyle =
  | "soft_watercolor"
  | "fluffy_pastel"
  | "crayon"
  | "flat_illustration"
  | "anime_storybook"
  | "classic_picture_book"
  | "toy_3d"
  | "paper_collage"
  | "pencil_sketch"
  | "colorful_pop"
  | "watercolor"
  | "flat";
export type PageCount = 4 | 8 | 12;

export interface FixedStoryPageTemplate {
  textTemplate: string;
  textTemplatesByAge?: Partial<Record<AgeBand, string>>;
  imagePromptTemplate: string;
}

export interface FixedStoryTemplate {
  titleTemplate: string;
  pages: FixedStoryPageTemplate[];
}

export interface BookInput {
  childName: string;
  childAge?: number;
  favorites?: string;
  lessonToTeach?: string;
  memoryToRecreate?: string;
  characterLook?: string;
  signatureItem?: string;
  colorMood?: string;
  place?: string;
  familyMembers?: string;
  season?: string;
  parentMessage?: string;
  storyRequest?: string;
}

export type GenderExpression = "boy" | "girl" | "neutral" | "unspecified";
export type OutfitMode = "profile_default" | "theme_auto" | "user_custom";
export interface AvatarRevisionRequest {
  ageFeel?: "younger" | "slightly_younger" | "slightly_older" | "older";
  hairStyle?: "shorter" | "longer" | "straighter" | "curlier" | "neater";
  faceMood?: "gentler" | "brighter" | "calmer" | "more_expressive";
  expression?: "bigger_smile" | "soft_smile" | "calm_expression" | "more_playful";
  outfit?: "more_casual" | "more_colorful" | "simpler" | "more_storybook_like";
  signatureItem?: "more_visible" | "smaller" | "better_positioned" | "less_emphasized";
  colorTone?: "warmer" | "softer" | "brighter" | "less_saturated";
  likeness?: "closer_to_child" | "keep_storybook_but_closer" | "more_distinctive_features" | "more_natural_balance";
  notes?: string;
}

export interface ChildPersonalityProfile {
  traits?: string[];
  favoritePlay?: string;
  favoriteThings?: string[];
  dislikes?: string[];
  strengths?: string[];
  currentChallenge?: string;
}

export interface ChildVisualProfile {
  characterLook?: string;
  signatureItem?: string;
  outfit?: string;
  colorMood?: string;
  approvedImageUrl?: string;
  referenceImageUrl?: string;
  characterBible?: string;
  basePrompt?: string;
  version: number;
}

export interface ChildGenerationSettings {
  defaultStyle: IllustrationStyle;
  defaultPageCount: PageCount;
  avoidExpressions?: string[];
  allowedPersonalization: boolean;
}

export interface ChildProfileData {
  displayName: string;
  nickname?: string;
  age?: number;
  birthYearMonth?: string;
  genderExpression?: GenderExpression;
  personality: ChildPersonalityProfile;
  visualProfile: ChildVisualProfile;
  generationSettings: ChildGenerationSettings;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  active: boolean;
}

export interface ChildProfileSnapshot {
  displayName: string;
  nickname?: string;
  age?: number;
  genderExpression?: GenderExpression;
  personality: ChildPersonalityProfile;
  visualProfile: ChildVisualProfile;
}

export interface CharacterUsage {
  useRegisteredCharacter: boolean;
  faceSource: "child_profile";
  outfitMode: OutfitMode;
  customOutfit?: string | null;
  keepSignatureItem: boolean;
}

export interface BookData {
  userId: string;
  childId?: string | null;
  childProfileSnapshot?: ChildProfileSnapshot;
  characterUsage?: CharacterUsage;
  title: string;
  theme: string;
  categoryGroupId?: string;
  templateId?: string;
  creationMode?: CreationMode;
  priceTier?: PriceTier;
  storyCostLevel?: StoryCostLevel;
  productPlan?: ProductPlan;
  imageQualityTier?: ImageQualityTier;
  characterConsistencyMode?: CharacterConsistencyMode;
  imageModelProfile?: ImageModelProfile;
  storyModel?: string;
  storyModelFallbackUsed?: boolean;
  storyGenerationAttempts?: number;
  storyTextRewriteUsed?: boolean;
  storyTextRewriteModel?: string;
  storyTextRewriteAttempts?: number;
  storyCast?: StoryCharacter[];
  storyGoal?: string;
  mainQuestObject?: string;
  forbiddenQuestObjects?: string[];
  storyTitleCandidate?: string;
  generatedTextPreview?: string[];
  failureStage?: "story_generation" | "schema_validation" | "image_generation" | "validation" | "quality_gate";
  failureProvider?: "gemini" | "replicate" | "system";
  failureReason?: "service_unavailable" | "rate_limited" | "overloaded" | "unknown";
  retryable?: boolean;
  technicalErrorMessage?: string;
  failedAt?: FirebaseFirestore.Timestamp;
  style: IllustrationStyle;
  pageCount: PageCount;
  status: BookStatus;
  progress: number;
  coverImageUrl?: string;
  storyQualityReport?: StoryQualityReportData;
  input: BookInput;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp | null;
}

export interface PageData {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  textCharCount?: number;
  textSentenceCount?: number;
  textQualityWarnings?: string[];
  status: PageStatus;
  imageModel?: string;
  imageQualityTier?: ImageQualityTier;
  imagePurpose?: ImagePurpose;
  inputImageUrlsCount?: number;
  inputReferenceCount?: number;
  usedCharacterReference?: boolean;
  characterConsistencyMode?: CharacterConsistencyMode;
  imageModelProfile?: ImageModelProfile;
  pageVisualRole?: PageVisualRole;
  appearingCharacterIds?: string[];
  focusCharacterId?: string;
}

export interface TemplateData {
  name: string;
  description: string;
  icon: string;
  genre?: string;
  categoryGroupId?: string;
  subcategoryId?: string;
  parentIntent?: string;
  recommendedAgeMin?: number;
  recommendedAgeMax?: number;
  requiredInputs?: string[];
  optionalInputs?: string[];
  themeTags?: string[];
  isOriginalEntry?: boolean;
  creationMode?: CreationMode;
  priceTier?: PriceTier;
  storyCostLevel?: StoryCostLevel;
  fixedStory?: FixedStoryTemplate;
  sampleImageUrl?: string;
  sampleImages?: {
    light?: string;
    standard?: string;
    premium?: string;
  };
  sampleImageAlt?: string;
  visualDirection?: string;
  order: number;
  systemPrompt: string;
  active: boolean;
}

export interface CategoryGroupData {
  name: string;
  description: string;
  icon: string;
  parentIntent: string;
  order: number;
  active: boolean;
}

export interface GeneratedStoryNarrativeDevice {
  repeatedPhrase?: string;
  visualMotif?: string;
  setup?: string;
  payoff?: string;
  hiddenDetails?: string[];
}

export interface GeneratedStoryPage {
  text: string;
  imagePrompt: string;
  compositionHint?: string;
  visualMotifUsage?: string;
  hiddenDetail?: string;
  pageVisualRole?: PageVisualRole;
  appearingCharacterIds?: string[];
  focusCharacterId?: string;
}

export interface StoryCharacter {
  characterId: string;
  displayName: string;
  role: StoryCharacterRole;
  visualBible: string;
  silhouette?: string;
  colorPalette?: string[];
  signatureItems?: string[];
  doNotChange?: string[];
  canChangeByScene?: string[];
  referenceImageUrl?: string;
  approvedImageUrl?: string;
}

export interface StoryQualityReportData {
  ok: boolean;
  summary: {
    pageCount: number;
    averageCharsPerPage: number;
    averageSentencesPerPage: number;
    minCharsPerPage: number;
    minSentencesPerPage: number;
  };
  issues: Array<{
    severity: "warning" | "error";
    code: string;
    message: string;
    pageIndex?: number;
    actual?: number | string;
    expected?: number | string;
  }>;
}

export interface GeneratedStory {
  title: string;
  characterBible: string;
  styleBible: string;
  storyGoal?: string;
  mainQuestObject?: string;
  forbiddenQuestObjects?: string[];
  narrativeDevice?: GeneratedStoryNarrativeDevice;
  cast?: StoryCharacter[];
  storyModel?: string;
  storyModelFallbackUsed?: boolean;
  storyGenerationAttempts?: number;
  pages: GeneratedStoryPage[];
}

export interface LLMClient {
  generateStory(params: {
    systemPrompt: string;
    childName: string;
    childAge?: number;
    favorites?: string;
    lessonToTeach?: string;
    memoryToRecreate?: string;
    characterLook?: string;
    signatureItem?: string;
    colorMood?: string;
    place?: string;
    familyMembers?: string;
    season?: string;
    parentMessage?: string;
    storyRequest?: string;
    pageCount: PageCount;
    style: IllustrationStyle;
    productPlan?: ProductPlan;
    creationMode?: CreationMode;
    theme?: string;
    categoryGroupId?: string;
    storyModelCandidates?: string[];
  }): Promise<GeneratedStory>;
  rewriteStoryText?(params: {
    story: GeneratedStory;
    systemPrompt: string;
    childName: string;
    childAge?: number;
    style: IllustrationStyle;
    productPlan?: ProductPlan;
    creationMode?: CreationMode;
    storyModelCandidates?: string[];
  }): Promise<{
    pages: Array<{ text: string }>;
    storyTextRewriteModel?: string;
    storyTextRewriteAttempts?: number;
  }>;
}

export interface ImageClient {
  generateImage(
    prompt: string,
    options?: {
      inputImageUrls?: string[];
      purpose?: ImagePurpose;
      imageQualityTier?: ImageQualityTier;
      imageModelProfile?: ImageModelProfile;
    }
  ): Promise<Buffer>;
}
