import type {AIImageAspectRatio, AIImageSize, ImageModel, ImagePromptLanguage} from './images.js';

/** `POST /v1/banana/images` 独有：官方渠道按档计价。`/v1/images` 也接受同一组值。 */
export type BananaImageQuality = 'low' | 'medium' | 'high';

export type BananaImageScope = 'me' | 'public';

export type BananaReferenceImageBase64 = {
	data: string;
	mimeType: string;
};

export type BananaReferenceImageDimension = {
	width: number;
	height: number;
};

export interface CreateBananaImageParams {
	prompt: string;
	/** 最多 14 张；各模型另有更严的上限（GPT-Image-2 4 张、Wan2.7 9 张、Seedream 10 张），由后端拒绝。 */
	referenceImageUrls?: string[];
	/** 最多 5 张，且与 URL 参考图共享全局限流。 */
	referenceImageBase64?: BananaReferenceImageBase64[];
	/** 顺序对齐 referenceImageUrls + referenceImageBase64；官方渠道按真实宽高逐张计价。 */
	referenceImageDimensions?: BananaReferenceImageDimension[];
	language?: ImagePromptLanguage;
	aspectRatio?: AIImageAspectRatio;
	imageSize?: AIImageSize;
	/** 生成即公开。后端默认 false，且非订阅用户传 true 会被订阅墙拒绝。 */
	isPublic?: boolean;
	isLossless?: boolean;
	isRetry?: boolean;
	model?: ImageModel;
	enableSearch?: boolean;
	quality?: BananaImageQuality;
	/** 重试语义：指向被重试的原图。 */
	rootImageId?: string;
	/** 编辑链语义，与 rootImageId 不复用。 */
	editRootImageId?: string;
	editParentImageId?: string;
	editSummary?: string;
	/**
	 * 一次多图生成的分组 id：n 个并行请求带同一个值，Featured/Trending 据此折叠成一组。
	 * 后端不生成它——客户端不传就没有分组，n 张图会各自散在发现面上。
	 */
	batchId?: string;
}

export interface CreateBananaImageResponse {
	imageId: string;
}

export interface BananaImageCreator {
	userId?: string;
	nickname?: string;
	avatar?: string;
}

export interface BananaImageItem {
	id: string;
	prompt: string;
	referenceImageUrls: string[];
	imageUrl: string;
	thumbnailUrl: string;
	aspectRatio: string;
	imageSize: string;
	quality?: string;
	modelName?: string;
	enableSearch?: boolean;
	createdAt: number;
	creator?: BananaImageCreator;
	hasFavorited?: boolean;
	stats?: {favoriteCount?: number};
	editRootImageId?: string;
	editParentImageId?: string;
	editSummary?: string;
	/** 只在 `scope=me` 或所有者读取时返回。 */
	status?: string;
	isPublic?: boolean;
	isRetry?: boolean;
	rootImageId?: string;
	latestEditImageId?: string;
	latestEditThumbnailUrl?: string;
}

export interface ListBananaImagesParams {
	page?: number;
	pageSize?: number;
	/** 默认 `public`；用 `me` 读自己的图（未登录会被拒）。 */
	scope?: BananaImageScope;
	status?: string;
	modelName?: ImageModel;
	editRootImageId?: string;
}

export interface ListBananaImagesResponse {
	items: BananaImageItem[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
	};
}
