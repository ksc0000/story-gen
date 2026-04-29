import { Timestamp } from "firebase/firestore";

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

export interface UserDoc {
  displayName: string;
  email: string;
  plan: UserPlan;
  activeChildId?: string | null;
  createdAt: Timestamp;
  monthlyGenerationCount: number;
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

export interface ChildProfileDoc {
  displayName: string;
  nickname?: string;
  age?: number;
  birthYearMonth?: string;
  genderExpression?: GenderExpression;
  personality: ChildPersonalityProfile;
  visualProfile: ChildVisualProfile;
  generationSettings: ChildGenerationSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface BookDoc {
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
  errorMessage?: string;
  input: BookInput;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
}

export interface PageDoc {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt: string;
  status: PageStatus;
}

export interface TemplateDoc {
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

export interface CategoryGroupDoc {
  name: string;
  description: string;
  icon: string;
  parentIntent: string;
  order: number;
  active: boolean;
}

export interface UsageDoc {
  bookGenerationCount: number;
  avatarGenerationCount: number;
  updatedAt: Timestamp;
}

const VALID_PAGE_COUNTS: readonly number[] = [4, 8, 12];

export function isValidPageCount(n: number): n is PageCount {
  return VALID_PAGE_COUNTS.includes(n);
}

export function isValidBookInput(input: BookInput): boolean {
  return typeof input.childName === "string" && input.childName.trim().length > 0;
}
