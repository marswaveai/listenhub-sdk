export type ImageModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

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
	| '8:1'
	| '9:16'
	| '16:9'
	| '21:9';

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
