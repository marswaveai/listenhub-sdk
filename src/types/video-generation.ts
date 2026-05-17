export type VideoGenerationModel = 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast';

export type VideoGenerationResolution = '480p' | '720p' | '1080p';

export type VideoGenerationRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';

export type VideoGenerationTaskStatus = 'pending' | 'generating' | 'uploading' | 'success' | 'failed';

export type VideoContentRole =
	| 'first_frame'
	| 'last_frame'
	| 'reference_image'
	| 'reference_video'
	| 'reference_audio';

export type VideoGenerationErrorCode =
	| '32001'
	| '32002'
	| '32003'
	| '32004'
	| '32005'
	| '32006'
	| '32007'
	| '32008';

export interface VideoContentText {
	type: 'text';
	text: string;
}

export interface VideoContentImageUrl {
	type: 'image_url';
	image_url: {url: string};
	role: 'first_frame' | 'last_frame' | 'reference_image';
}

export interface VideoContentVideoUrl {
	type: 'video_url';
	video_url: {url: string};
	role: 'reference_video';
}

export interface VideoContentAudioUrl {
	type: 'audio_url';
	audio_url: {url: string};
	role: 'reference_audio';
}

export type VideoContentItem =
	| VideoContentText
	| VideoContentImageUrl
	| VideoContentVideoUrl
	| VideoContentAudioUrl;

export interface CreateVideoGenerationParams {
	model?: VideoGenerationModel;
	content: VideoContentItem[];
	resolution?: VideoGenerationResolution;
	ratio?: VideoGenerationRatio;
	duration?: number;
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number;
}

export interface ListVideoGenerationTasksParams {
	page?: number;
	pageSize?: number;
	status?: VideoGenerationTaskStatus;
}

export interface EstimateVideoGenerationCreditsParams {
	model: VideoGenerationModel;
	resolution: VideoGenerationResolution;
	duration: number;
	hasVideoInput?: boolean;
	inputVideoDuration?: number;
	ratio?: VideoGenerationRatio;
}

export interface CreateVideoGenerationResponse {
	taskId: string;
	status: VideoGenerationTaskStatus;
}

export interface VideoGenerationTaskDetail {
	id: string;
	status: VideoGenerationTaskStatus;
	model: string;
	params: {
		content: VideoContentItem[];
		resolution: string;
		ratio: string;
		duration: number;
		generateAudio: boolean;
		seed: number;
	};
	videoUrl?: string;
	providerVideoUrl?: string;
	duration?: number;
	resolution?: string;
	ratio?: string;
	seed?: number;
	creditCharged: number;
	createdAt: number;
	updatedAt: number;
}

export interface VideoGenerationTaskListItem {
	id: string;
	status: VideoGenerationTaskStatus;
	model: string;
	params: {
		resolution: string;
		ratio: string;
		duration: number;
	};
	videoUrl?: string;
	providerVideoUrl?: string;
	seed?: number;
	creditCharged: number;
	createdAt: number;
}

export interface ListVideoGenerationTasksResponse {
	items: VideoGenerationTaskListItem[];
	page: number;
	pageSize: number;
	total: number;
}

export interface EstimateVideoGenerationCreditsResponse {
	tokens: number;
	credits: number;
}
