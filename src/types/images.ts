export type ImageModel = "gemini-3-pro-image-preview" | "gemini-3.1-flash-image-preview";

export type ImagePromptLanguage = "auto" | "en" | "ja" | "ko" | "hi" | "zh" | "pt" | "es";

export type AIImageAspectRatio =
  | "1:1"
  | "1:4"
  | "1:8"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:1"
  | "4:3"
  | "9:16"
  | "16:9"
  | "21:9"
  | "8:1" // Only works on gemini-3.1-flash-image-preview
  | "1:8"; // Only works on gemini-3.1-flash-image-preview

export type AIImageSize = "1K" | "2K" | "4K";

export interface CreateAIImageParams {
  prompt: string;
  referenceImageUrls?: string[];
  language?: ImagePromptLanguage;
  aspectRatio?: AIImageAspectRatio;
  imageSize?: AIImageSize;
  model?: ImageModel;
  isLossless?: boolean;
  enableSearch?: boolean;
}

export interface CreateAIImageResponse {
  imageId: string;
}

export interface AIImageItem {
  id: string;
  prompt: string;
  referenceImageUrls: string[];
  imageUrl: string;
  thumbnailUrl: string;
  aspectRatio: string;
  imageSize: string;
  language: string;
  isLossless: boolean;
  status: string;
  reviewStatus: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  creator: {
    nickname: string;
    avatar: string;
  };
}

export interface ListAIImagesParams {
  page?: number;
  pageSize?: number;
}

export interface ListAIImagesResponse {
  items: AIImageItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
