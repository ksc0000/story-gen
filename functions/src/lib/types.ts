/// <reference types="firebase-admin" />

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "failed";
export type PageStatus = "pending" | "generating" | "completed" | "failed";
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
  style: IllustrationStyle;
  pageCount: PageCount;
  status: BookStatus;
  progress: number;
  coverImageUrl?: string;
  input: BookInput;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp | null;
}

export interface PageData {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  status: PageStatus;
}

export interface TemplateData {
  name: string;
  description: string;
  icon: string;
  genre?: string;
  categoryGroupId?: string;
  parentIntent?: string;
  recommendedAgeMin?: number;
  recommendedAgeMax?: number;
  requiredInputs?: string[];
  optionalInputs?: string[];
  sampleImageUrl?: string;
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

export interface GeneratedStory {
  title: string;
  characterBible: string;
  styleBible: string;
  pages: Array<{ text: string; imagePrompt: string }>;
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
  }): Promise<GeneratedStory>;
}

export interface ImageClient {
  generateImage(prompt: string, options?: { inputImageUrls?: string[] }): Promise<Buffer>;
}
