/// <reference types="firebase-admin" />

export type UserPlan = "free" | "premium";
export type BookStatus = "generating" | "completed" | "failed";
export type PageStatus = "pending" | "generating" | "completed" | "failed";
export type IllustrationStyle = "watercolor" | "flat" | "crayon";
export type PageCount = 4 | 8 | 12;

export interface BookInput {
  childName: string;
  childAge?: number;
  favorites?: string;
  lessonToTeach?: string;
  memoryToRecreate?: string;
}

export interface BookData {
  userId: string;
  title: string;
  theme: string;
  style: IllustrationStyle;
  pageCount: PageCount;
  status: BookStatus;
  progress: number;
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
  order: number;
  systemPrompt: string;
  active: boolean;
}

export interface GeneratedStory {
  title: string;
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
    pageCount: PageCount;
    style: IllustrationStyle;
  }): Promise<GeneratedStory>;
}

export interface ImageClient {
  generateImage(prompt: string): Promise<Buffer>;
}
