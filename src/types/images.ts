/**
 * 后端 `ACCEPTED_IMAGE_MODEL_INPUTS` 的镜像：7 个 GA ID + 2 个仍被放行的 legacy preview 别名。
 * `/v1/images` 与 `/v1/banana/images` 校验的是同一份清单（后端默认值都是 `gpt-image-2`），
 * 所以两条路由共用这个联合类型；漂移会让 SDK 调不到后端已支持的模型（issue #728）。
 */
export type ImageModel =
	| 'gemini-3-pro-image'
	| 'gemini-3.1-flash-image'
	| 'gpt-image-2'
	| 'gpt-image-2-official'
	| 'wan2.7-image-pro'
	| 'wan2.7-image'
	| 'seedream-5-0-pro'
	| 'gemini-3-pro-image-preview'
	| 'gemini-3.1-flash-image-preview';

/** GA 模型 ID（不含 legacy preview 别名）。 */
export const IMAGE_MODELS = [
	'gemini-3-pro-image',
	'gemini-3.1-flash-image',
	'gpt-image-2',
	'gpt-image-2-official',
	'wan2.7-image-pro',
	'wan2.7-image',
	'seedream-5-0-pro',
] as const;

/** 后端仍放行、会被 normalize 成 GA ID 的历史 preview 值。 */
export const LEGACY_IMAGE_MODEL_ALIASES = [
	'gemini-3-pro-image-preview',
	'gemini-3.1-flash-image-preview',
] as const;

/** 入参校验可接受的全部值，与后端 `ACCEPTED_IMAGE_MODEL_INPUTS` 逐项对齐。 */
export const ACCEPTED_IMAGE_MODELS = [...IMAGE_MODELS, ...LEGACY_IMAGE_MODEL_ALIASES] as const;

export type ImagePromptLanguage = 'auto' | 'en' | 'ja' | 'ko' | 'hi' | 'zh' | 'pt' | 'es';

export type AIImageAspectRatio =
	| '1:1'
	| '1:4'
	| '1:8'
	| '2:3'
	| '3:2'
	| '3:4'
	| '4:1'
	| '4:3'
	| '9:16'
	| '16:9'
	| '21:9'
	| '8:1' // Only works on gemini-3.1-flash-image
	| '1:8'; // Only works on gemini-3.1-flash-image

export type AIImageSize = '1K' | '2K' | '4K';

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

/**
 * Parameters for batch-deleting AI images (`DELETE /v1/images`).
 * Up to 100 ids per call (the backend enforces `.min(1).max(100)`).
 */
export interface DeleteAIImagesParams {
	ids: string[];
}
