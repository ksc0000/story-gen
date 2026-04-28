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
}

export interface BookData {
  userId: string;
  title: string;
  theme: string;
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
  sampleImageUrl?: string;
  sampleImageAlt?: string;
  visualDirection?: string;
  order: number;
  systemPrompt: string;
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
    pageCount: PageCount;
    style: IllustrationStyle;
  }): Promise<GeneratedStory>;
}

export interface ImageClient {
  generateImage(prompt: string, options?: { inputImageUrls?: string[] }): Promise<Buffer>;
}
