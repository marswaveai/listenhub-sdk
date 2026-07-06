export type VideoGenerationModel =
	| 'doubao-seedance-2-pro'
	| 'doubao-seedance-2-fast'
	| 'happyhorse';

export type VideoGenerationResolution = '480p' | '720p' | '1080p';

export type VideoGenerationRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '4:5' | '5:4';

export type VideoGenerationTaskStatus =
	| 'pending'
	| 'generating'
	| 'uploading'
	| 'success'
	| 'failed';

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
	image_url: {url: string; width?: number; height?: number; size?: number};
	role: 'first_frame' | 'last_frame' | 'reference_image';
}

export interface VideoContentVideoUrl {
	type: 'video_url';
	video_url: {
		url: string;
		width?: number;
		height?: number;
		duration?: number;
		fps?: number;
		size?: number;
	};
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

export interface VideoReferenceImageMeta {
	role: 'first_frame' | 'last_frame' | 'reference_image';
	width: number;
	height: number;
	size?: number;
}

export interface VideoReferenceVideoMeta {
	role: 'reference_video';
	width: number;
	height: number;
	duration?: number;
	fps?: number;
	size?: number;
}

/**
 * Parameters for creating a video generation task.
 *
 * Model-specific constraints (enforced server-side):
 * - `happyhorse`: no 480p resolution; no `last_frame` or `audio_url` content; ratio supports 4:5/5:4;
 *   min duration 3s; max prompt length 2500 chars; inputVideoDuration range [3,60]
 * - `doubao-seedance-*`: min duration 4s; max prompt length 500 chars; inputVideoDuration range [2,15];
 *   1080p only available on `doubao-seedance-2-pro`
 */
export interface CreateVideoGenerationParams {
	model?: VideoGenerationModel;
	content: VideoContentItem[];
	resolution?: VideoGenerationResolution;
	ratio?: VideoGenerationRatio;
	duration?: number;
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number;
	/** Reference image dimensions used by Seedance validation. Prefer this over embedding metadata in content. */
	referenceImages?: VideoReferenceImageMeta[];
	/** Reference video dimensions/duration used by Seedance validation. Prefer this over embedding metadata in content. */
	referenceVideos?: VideoReferenceVideoMeta[];
	/** Audio handling for happyhorse video-edit mode. Only effective when model is 'happyhorse' and content includes a video_url. */
	audioSetting?: 'auto' | 'origin';
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
	referenceImages?: VideoReferenceImageMeta[];
	referenceVideos?: VideoReferenceVideoMeta[];
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
		referenceImages?: VideoReferenceImageMeta[];
		referenceVideos?: VideoReferenceVideoMeta[];
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
		referenceImages?: VideoReferenceImageMeta[];
		referenceVideos?: VideoReferenceVideoMeta[];
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

// --- PixVerse ---

export type PixVerseModel = 'pixverse' | 'v6' | 'v5' | 'v4.5';

export type PixVerseLanguage = 'zh' | 'en';

export type PixVerseCapability =
	| 'text_to_video'
	| 'image_to_video'
	| 'transition'
	| 'multi_transition'
	| 'fusion'
	| 'restyle'
	| 'mimic'
	| 'lip_sync'
	| 'agent';

export type PixVerseQuality = '360p' | '540p' | '720p' | '1080p';

export type PixVerseAspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';

export type PixVerseAgentType = 'ad_master' | 'promo_mix';

export type PixVerseImageReferenceType = 'subject' | 'background';

export type PixVerseBrandStickerPosition =
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'upper_left'
	| 'lower_left'
	| 'upper_right'
	| 'lower_right';

export type PixVerseIntroOutroPosition = 'start' | 'end';

/** A media asset reference. `duration` is in seconds (integer). */
export interface PixVerseAsset {
	url: string;
	duration?: number;
}

export interface PixVerseMultiTransitionItem {
	imageUrl: string;
	duration: number;
	prompt: string;
}

export interface PixVerseImageReference {
	type: PixVerseImageReferenceType;
	imageUrl: string;
	/** Reference name; must match `@refName` token inside the fusion prompt. */
	refName: string;
}

export interface PixVerseTts {
	speakerId: string;
	content: string;
}

export interface PixVerseBrandSticker {
	imageUrl: string;
	position: PixVerseBrandStickerPosition;
}

export interface PixVerseIntroOutroClip {
	videoUrl: string;
	position: PixVerseIntroOutroPosition;
}

/** Nested PixVerse-specific options. All fields optional; relevance depends on capability. */
export interface PixVerseOptions {
	agentType?: PixVerseAgentType;
	motionMode?: string;
	cameraMovement?: string;
	templateId?: string | number;
	sourceVideoId?: string | number;
	restyleId?: string | number;
	multiTransition?: PixVerseMultiTransitionItem[];
	imageReferences?: PixVerseImageReference[];
	tts?: PixVerseTts;
	soundEffectSwitch?: boolean;
	soundEffectContent?: string;
	lipSyncTtsSwitch?: boolean;
	lipSyncTtsSpeakerId?: string;
	lipSyncTtsContent?: string;
	brandSticker?: PixVerseBrandSticker;
	introOutroClip?: PixVerseIntroOutroClip;
}

/**
 * Parameters for creating a PixVerse video generation task.
 *
 * Capability-specific constraints (enforced server-side):
 * - `mimic`: locked to 720p quality
 * - `agent`: quality must be 720p or 1080p; duration must be 20/30/60 (default 30); requires `pixverse.agentType`
 * - `multi_transition`: default quality 360p; requires `pixverse.multiTransition` (2-7 items)
 * - `fusion`: prompt must contain `@refName` for each `pixverse.imageReferences` entry
 * - `promo_mix` agent: requires >= 4 images
 * - `restyle` / `lip_sync`: may reuse a prior succeeded PixVerse task via `sourceTaskId`
 */
export interface CreatePixVerseVideoParams {
	capability: PixVerseCapability;
	model?: PixVerseModel;
	/** Service region; `en` (default) is international, `zh` is mainland China. */
	language?: PixVerseLanguage;
	prompt?: string;
	/** Output duration in seconds (1-60, default 5; agent: 20/30/60). */
	duration?: number;
	aspectRatio?: PixVerseAspectRatio;
	quality?: PixVerseQuality;
	/** Reuse a prior succeeded PixVerse task (restyle / lip_sync). */
	sourceTaskId?: string;
	images?: PixVerseAsset[];
	videos?: PixVerseAsset[];
	audios?: PixVerseAsset[];
	pixverse?: PixVerseOptions;
}

export interface CreatePixVerseVideoResponse {
	taskId: string;
	episodeId?: string;
	status: 'generating';
}

export interface EstimatePixVerseVideoCreditsParams {
	capability: PixVerseCapability;
	model?: PixVerseModel;
	language?: PixVerseLanguage;
	duration?: number;
	quality?: PixVerseQuality;
	pixverse?: {
		agentType?: PixVerseAgentType;
		soundEffectSwitch?: boolean;
		lipSyncTtsSwitch?: boolean;
		/** Source video duration in seconds (1-180), used for restyle / lip_sync estimates. */
		sourceDuration?: number;
		/** Input audio duration in seconds (1-180), used for lip_sync estimates. */
		inputAudioDuration?: number;
		multiTransition?: Array<{duration: number}>;
		tts?: {content: string};
	};
}

/** Shared shape with {@link EstimateVideoGenerationCreditsResponse}. */
export interface EstimatePixVerseVideoCreditsResponse {
	tokens: number;
	credits: number;
}
