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
}

export interface BookDoc {
  userId: string;
  title: string;
  theme: string;
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
  sampleImageUrl?: string;
  sampleImageAlt?: string;
  visualDirection?: string;
  order: number;
  systemPrompt: string;
  active: boolean;
}

const VALID_PAGE_COUNTS: readonly number[] = [4, 8, 12];

export function isValidPageCount(n: number): n is PageCount {
  return VALID_PAGE_COUNTS.includes(n);
}

export function isValidBookInput(input: BookInput): boolean {
  return typeof input.childName === "string" && input.childName.trim().length > 0;
}
