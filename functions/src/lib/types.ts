/// <reference types="firebase-admin" />

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "partial_completed" | "failed";
export type CoverStatus = "not_started" | "generating" | "completed" | "failed";
export type ReadingStructureVersion = "v1_pages_only" | "v2_cover_title_story";
export type PageStatus = "pending" | "generating" | "completed" | "image_failed" | "fallback_completed" | "failed";
export type GenerationMode = "reliable_fast" | "quality";
export type GenerationReliabilityStatus = "ok" | "partial" | "failed";
export type CreationMode = "fixed_template" | "guided_ai" | "original_ai" | "photo_story";
export type PriceTier = "ume" | "take" | "matsu";
export type StoryCostLevel = "none" | "low" | "standard";
export type ProductPlan = "free" | "standard_paid" | "premium_paid";
export type ImageQualityTier = "light" | "standard" | "premium";
export type CharacterConsistencyMode = "cover_only" | "key_pages" | "all_pages";
export type BackgroundMode = "story_flexible" | "profile_default" | "fixed";
export type ImageModelProfile =
  | "klein_fast"
  | "klein_base"
  | "pro_consistent"
  | "kontext_reference"
  | "kontext_max"
  | "openai_mini"             // T6-62: GPT-image-1-mini (free tier)
  | "openai_standard"         // T6-62: GPT-image-1 (standard tier)
  | "flux11_pro_candidate"    // T6-37: diagnostic only — not for production routing
  | "openai_image_candidate"; // T6-43: diagnostic only — OpenAI Image E005 smoke test
export type InputImageRole = "character_reference" | "style_reference" | "prev_page_reference";
export type InputImageSource =
  | "approvedImageUrl"
  | "referenceImageUrl"
  | "generatedReferenceImageUrl"
  | "stylePreviewImageUrl";
export type StoryCharacterKind =
  | "human_child"
  | "human_adult"
  | "animal"
  | "magical_creature"
  | "object_character"
  | "background";
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
export type QualityReviewStatus =
  | "not_reviewed"
  | "human_reviewed"
  | "llm_reviewed"
  | "needs_fix"
  | "approved";
export type QualityReviewerType = "human" | "llm";

export type IllustrationStyleProfile = {
  id: IllustrationStyle;
  name: string;
  previewImageUrl: string;
  styleBible: string;
  negativeStyleRules?: string[];
  usePreviewAsReference?: boolean;
};

export interface FixedStoryPageTemplate {
  textTemplate: string;
  textTemplatesByAge?: Partial<Record<AgeBand, string>>;
  imagePromptTemplate: string;
  pageVisualRole?: PageVisualRole;
}

export interface FixedStoryTemplate {
  titleTemplate: string;
  previewImageUrl?: string;
  coverImagePromptTemplate?: string;
  titleSpreadTextTemplate?: string;
  openingNarrationTemplate?: string;
  pageCount?: PageCount;
  layoutVariant?: "4_page" | "8_page" | "12_page";
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
  freeInput?: string;
  /** 相棒キャラクター */
  companionId?: string;
  companionName?: string;
  companionVisualDescription?: string;
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

export interface ScenePolicy {
  backgroundMode: BackgroundMode;
  preferredSettings?: string[];
  allowedSettingTypes?: string[];
  forbiddenVisualElements?: string[];
  sceneCoherenceRules?: string[];
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

export type AvatarCandidate = {
  generationId: string;
  imageUrl: string;
  style: IllustrationStyle;
  styleLabel: string;
  prompt: string;
};

export interface CompanionData {
  userId: string;
  name: string;
  /** buildVisualDescription() で生成した英語文字列 */
  visualDescription: string;
  generatedImageUrl?: string;
  /** 画像生成ジョブの進行状態。完了時はフィールドごと削除される */
  imageGenerationStatus?: "pending" | "generating" | "failed";
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface CompanionImageJob {
  userId: string;
  companionId: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: {
    message: string;
    code: string;
  };
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

export interface ChildAvatarGenerationJob {
  userId: string;
  childId: string;
  status: "pending" | "generating" | "completed" | "failed";
  request: {
    revisionRequest?: AvatarRevisionRequest;
    baseGenerationId?: string;
    variantStyle?: IllustrationStyle;
  };
  result?: {
    batchId: string;
    attemptNumber: number;
    candidates: AvatarCandidate[];
  };
  error?: {
    message: string;
    code: string;
  };
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
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
  sourcePhotos?: string[];
  priceTier?: PriceTier;
  storyCostLevel?: StoryCostLevel;
  productPlan?: ProductPlan;
  imageQualityTier?: ImageQualityTier;
  characterConsistencyMode?: CharacterConsistencyMode;
  characterBible?: string;
  imageModelProfile?: ImageModelProfile;
  scenePolicy?: ScenePolicy;
  storyModel?: string;
  storyModelFallbackUsed?: boolean;
  storyGenerationAttempts?: number;
  selectedStyleId?: IllustrationStyle;
  selectedStyleName?: string;
  styleBible?: string;
  stylePreviewImageUrl?: string;
  stylePreviewUsedAsReference?: boolean;
  inputImageRoles?: InputImageRole[];
  storyTextRewriteUsed?: boolean;
  storyTextRewriteModel?: string;
  storyTextRewriteAttempts?: number;
  storyCast?: StoryCharacter[];
  storyGoal?: string;
  mainQuestObject?: string;
  forbiddenQuestObjects?: string[];
  titleSpreadText?: string;
  openingNarration?: string;
  coverImagePrompt?: string;
  storyTitleCandidate?: string;
  generatedTextPreview?: string[];
  createdAtMs?: number;
  createdAtSource?: string;
  updatedAt?: FirebaseFirestore.Timestamp;
  updatedAtMs?: number;
  generationStartedAt?: FirebaseFirestore.Timestamp;
  generationStartedAtMs?: number;
  completedAt?: FirebaseFirestore.Timestamp;
  completedAtMs?: number;
  failedAtMs?: number;
  backfilledAt?: FirebaseFirestore.Timestamp;
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
  coverStatus?: CoverStatus;
  coverGeneratedAtMs?: number;
  coverFailureReason?: string;
  coverImageModelProfile?: ImageModelProfile;
  coverImageDurationMs?: number;
  coverImageFallbackUsed?: boolean;
  hasCoverPage?: boolean;
  readingStructureVersion?: ReadingStructureVersion;
  storyQualityReport?: StoryQualityReportData;
  storyQualityScore?: number;
  illustrationQualityScore?: number;
  characterConsistencyScore?: number;
  personalizationScore?: number;
  safetyScore?: number;
  overallQualityScore?: number;
  qualityReviewStatus?: QualityReviewStatus;
  qualityReviewedAtMs?: number;
  qualityReviewerType?: QualityReviewerType;
  qualityReviewer?: string;
  qualityReviewReason?: string;
  qualityFlaggedIssues?: QualityFlaggedIssue[];
  qualityRecommendedFixes?: QualityRecommendedFix[];
  input: BookInput;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp | null;
  generationMode?: GenerationMode;
  generationDurationMs?: number;
  averageImageDurationMs?: number;
  maxImageDurationMs?: number;
  imageSuccessCount?: number;
  imageFailureCount?: number;
  totalImageCount?: number;
  failedPageNumbers?: number[];
  generationReliabilityStatus?: GenerationReliabilityStatus;
  partialFailureReasons?: string[];
  lastCompletionCheckedAt?: FirebaseFirestore.Timestamp;
  lastCompletionCheckedAtMs?: number;
  recoveredFromPartialCompleted?: boolean;
  recoveredAt?: FirebaseFirestore.Timestamp;
  recoveredAtMs?: number;
  public?: boolean;
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
  inputImageRoles?: InputImageRole[];
  inputImageRefs?: Array<{
    role: InputImageRole;
    characterId?: string;
    url: string;
    source?: InputImageSource;
  }>;
  inputImageUrlsCount?: number;
  inputReferenceCount?: number;
  usedCharacterReference?: boolean;
  missingReferenceCharacters?: string[];
  characterConsistencyMode?: CharacterConsistencyMode;
  imageModelProfile?: ImageModelProfile;
  pageVisualRole?: PageVisualRole;
  appearingCharacterIds?: string[];
  focusCharacterId?: string;
  imageGenerationStartedAtMs?: number;
  imageCompletedAtMs?: number;
  imageDurationMs?: number;
  imageAttemptCount?: number;
  imageTimeoutCount?: number;
  imageFallbackUsed?: boolean;
  fallbackFromModelProfile?: ImageModelProfile;
  imageFailureReason?: string;
  imageRetryable?: boolean;
  sourcePhotoIndex?: number;
  replicateModel?: string;
  imageRegenerationStartedAt?: FirebaseFirestore.Timestamp;
  imageRegenerationStartedAtMs?: number;
  imageRegeneratedAt?: FirebaseFirestore.Timestamp;
  imageRegeneratedAtMs?: number;
  regenerationAttemptCount?: number;
  regenerationTriggeredBy?: "owner" | "admin";
  lastRegeneratedAt?: FirebaseFirestore.Timestamp;
  lastRegeneratedAtMs?: number;
  lastRegenerationSucceeded?: boolean;
}

/**
 * Subcollection entry at books/{bookId}/pages/{pageId}/regenerationHistory/{attemptId}
 */
export interface RegenerationHistoryEntry {
  attemptedAt: FirebaseFirestore.Timestamp;
  attemptedAtMs: number;
  attemptedBy: string;
  triggeredBy: "owner" | "admin";
  beforeStatus: PageStatus;
  afterStatus: PageStatus;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  imageModelProfile?: ImageModelProfile;
  fallbackUsed: boolean;
  durationMs: number;
  failureReason?: string;
  success: boolean;
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
  /** 穴埋めテンプレートフラグ。true のとき storyRequest が埋める変数として使用される */
  isBlankTemplate?: boolean;
  /** 穴埋めフィールドのラベル（例："何に挑戦しますか？"） */
  blankLabel?: string;
  /** 穴埋めフィールドのプレースホルダー（例："例：じてんしゃ、スイミング"） */
  blankExample?: string;
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
  sourcePhotoIndex?: number;
}

export interface StoryCharacter {
  characterId: string;
  displayName: string;
  role: StoryCharacterRole;
  visualBible: string;
  characterKind?: StoryCharacterKind;
  nonHuman?: boolean;
  noHumanFace?: boolean;
  noHumanBody?: boolean;
  scaleHint?: string;
  silhouette?: string;
  colorPalette?: string[];
  signatureItems?: string[];
  doNotChange?: string[];
  negativeCharacterRules?: string[];
  canChangeByScene?: string[];
  referenceImageUrl?: string;
  approvedImageUrl?: string;
  generatedReferenceImageUrl?: string;
  referenceImageGeneratedAt?: FirebaseFirestore.Timestamp;
  referenceImagePrompt?: string;
  referenceImageStatus?: "pending" | "completed" | "failed";
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

export interface QualityFlaggedIssue {
  severity: "low" | "medium" | "high" | "blocker";
  area: "story" | "illustration" | "character" | "personalization" | "safety";
  message: string;
  pageNumber?: number;
}

export interface QualityRecommendedFix {
  action:
    | "rewrite_story"
    | "repair_prompt"
    | "regenerate_page_image"
    | "fix_character_reference"
    | "reduce_personal_data"
    | "human_review_required";
  reason: string;
  pageNumber?: number;
}

export interface LLMQualityReviewResult {
  storyQualityScore: number;
  illustrationQualityScore: number;
  characterConsistencyScore: number;
  personalizationScore: number;
  safetyScore: number;
  overallQualityScore: number;
  confidence: number;
  reviewReason: string;
  flaggedIssues: QualityFlaggedIssue[];
  recommendedFixes: QualityRecommendedFix[];
}

export interface QualityReview {
  id: string;
  bookId: string;
  reviewerType: QualityReviewerType;
  reviewerId: string;
  storyScore: number;
  illustrationScore: number;
  characterConsistencyScore: number;
  personalizationScore: number;
  safetyScore: number;
  overallScore: number;
  status: QualityReviewStatus;
  reviewReason: string;
  flaggedIssues: QualityFlaggedIssue[];
  recommendedFixes: QualityRecommendedFix[];
  rubricVersion: string;
  llmAutoReviewResult?: LLMQualityReviewResult;
  createdAt: FirebaseFirestore.Timestamp;
  createdAtMs: number;
  updatedAt?: FirebaseFirestore.Timestamp;
  updatedAtMs?: number;
}

export interface GeneratedStory {
  title: string;
  characterBible: string;
  styleBible: string;
  storyGoal?: string;
  mainQuestObject?: string;
  forbiddenQuestObjects?: string[];
  titleSpreadText?: string;
  openingNarration?: string;
  coverImagePrompt?: string;
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
    freeInput?: string;
    pageCount: PageCount;
    style: IllustrationStyle;
    productPlan?: ProductPlan;
    creationMode?: CreationMode;
    theme?: string;
    categoryGroupId?: string;
    storyModelCandidates?: string[];
    sourcePhotos?: Array<{ mimeType: string; data: string }>;
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
