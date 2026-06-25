// --- Client Options ---
export interface OpenAPIClientOptions {
	/** OpenAPI Key (format: lh_sk_<keyId>_<secret>). Falls back to LISTENHUB_API_KEY env var. */
	apiKey?: string;
	/** Base URL, defaults to https://api.marswave.ai/openapi. Override with LISTENHUB_OPENAPI_URL env var. */
	baseURL?: string;
	timeout?: number;
	maxRetries?: number;
}

// --- 通用 ---
export interface OpenAPICreateEpisodeResponse {
	episodeId: string;
}
export interface OpenAPICreateTextContentResponse {
	episodeId: string;
	message: string;
}

// --- Flow Speech ---
export interface OpenAPICreateFlowSpeechParams {
	sources: Array<{type: 'text' | 'url'; content?: string; uri?: string}>;
	speakers: Array<{speakerId: string}>;
	language?: string;
	mode?: 'smart' | 'direct';
}
export interface OpenAPICreateFlowSpeechTTSParams {
	scripts: Array<{content: string; speakerId: string}>;
	title?: string;
}
export interface OpenAPIFlowSpeechDetail {
	episodeId: string;
	createdAt: number;
	processStatus: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	title?: string;
	outline?: string;
	cover?: string;
	audioUrl?: string;
	audioStreamUrl?: string;
	subtitlesUrl?: string;
	scripts?: string;
	sourceProcessResult?: {
		content: string;
		references?: Array<{type: string; urlCitation?: {title: string; url: string; favicon: string}}>;
	};
}

// --- Podcast ---
export interface OpenAPICreatePodcastParams {
	query?: string;
	sources?: Array<{type: 'text' | 'url'; content: string}>;
	speakers: Array<{speakerId: string}>;
	language?: string;
	mode?: string;
}
export interface OpenAPIPodcastDetail {
	episodeId: string;
	createdAt: number;
	processStatus: string;
	contentStatus?: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	credits?: number;
	title?: string;
	outline?: string;
	cover?: string;
	audioUrl?: string;
	audioStreamUrl?: string;
	subtitlesUrl?: string;
	scripts?: Array<{speakerId: string; speakerName: string; content: string}>;
	sourceProcessResult?: {
		content: string;
		references?: Array<{type: string; urlCitation?: {title: string; url: string; favicon: string}}>;
	};
}
export interface OpenAPIGenerateAudioParams {
	scripts?: Array<{content: string; speakerId: string}>;
}
export interface OpenAPIGenerateAudioResponse {
	success: boolean;
	message: string;
	episodeId: string;
	status: string;
}

// --- TTS ---
export interface OpenAPISpeechParams {
	scripts: Array<{content: string; speakerId: string}>;
}
export interface OpenAPISpeechResponse {
	audioUrl: string;
	audioDuration: number;
	subtitlesUrl?: string;
	taskId: string;
	credits: number;
}
export interface OpenAPITTSParams {
	input: string;
	voice: string;
	response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

// --- Storybook ---
export interface OpenAPICreateStorybookParams {
	sources: Array<{type: 'text' | 'url'; content: string}>;
	speakers?: Array<{speakerId: string}>;
	skipAudio?: boolean;
	style?: string;
	language?: string;
	mode?: 'info' | 'story' | 'slides';
}
export interface OpenAPIStorybookDetail {
	episodeId: string;
	createdAt: number;
	mode: string;
	processStatus: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	credits?: number;
	title?: string;
	cover?: string;
	audioUrl?: string;
	audioDuration?: number;
	videoUrl?: string;
	videoStatus?: 'not_generated' | 'pending' | 'success' | 'fail';
	pages?: Array<{text: string; pageNumber: number; imageUrl: string; audioTimestamp: number}>;
	sourceProcessResult?: {query: string; content: string; imageSources?: string[]};
}

// --- Image ---
export interface OpenAPIImageReferenceFileData {
	fileUri: string;
	mimeType: string;
}
export interface OpenAPIImageReferenceInlineData {
	data: string;
	mimeType: string;
}
export interface OpenAPICreateImageParams {
	provider: string;
	model?: string;
	prompt: string;
	referenceImages?: Array<{
		fileData?: OpenAPIImageReferenceFileData;
		inlineData?: OpenAPIImageReferenceInlineData;
	}>;
	imageConfig?: {
		imageSize?: '1K' | '2K' | '4K';
		aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
	};
}
export type OpenAPICreateImageResponse = Record<string, unknown>;

// --- Video Generation ---
export type OpenAPIVideoGenerationTaskStatus =
	| 'pending'
	| 'generating'
	| 'uploading'
	| 'success'
	| 'failed';
export interface OpenAPICreateVideoGenerationParams {
	model?: 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast' | 'happyhorse';
	content: Array<
		| {type: 'text'; text: string}
		| {
				type: 'image_url';
				image_url: {url: string};
				role: 'first_frame' | 'last_frame' | 'reference_image';
		  }
		| {type: 'video_url'; video_url: {url: string}; role: 'reference_video'}
		| {type: 'audio_url'; audio_url: {url: string}; role: 'reference_audio'}
	>;
	resolution?: '480p' | '720p' | '1080p';
	ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '4:5' | '5:4';
	duration?: number;
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number;
	/** Audio handling for happyhorse video-edit mode. Only effective when model is 'happyhorse' and content includes a video_url. */
	audioSetting?: 'auto' | 'origin';
}
export interface OpenAPICreateVideoGenerationResponse {
	taskId: string;
	status: OpenAPIVideoGenerationTaskStatus;
}
export interface OpenAPIVideoGenerationTaskDetail {
	id: string;
	status: OpenAPIVideoGenerationTaskStatus;
	model: string;
	params: {
		content: OpenAPICreateVideoGenerationParams['content'];
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
export interface OpenAPIListVideoGenerationTasksParams {
	page?: number;
	pageSize?: number;
	status?: OpenAPIVideoGenerationTaskStatus;
}
export interface OpenAPIListVideoGenerationTasksResponse {
	items: Array<{
		id: string;
		status: OpenAPIVideoGenerationTaskStatus;
		model: string;
		params: {resolution: string; ratio: string; duration: number};
		videoUrl?: string;
		providerVideoUrl?: string;
		seed?: number;
		creditCharged: number;
		createdAt: number;
	}>;
	page: number;
	pageSize: number;
	total: number;
}
export interface OpenAPIEstimateVideoCreditsParams {
	model: 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast' | 'happyhorse';
	resolution: '480p' | '720p' | '1080p';
	duration: number;
	hasVideoInput?: boolean;
	inputVideoDuration?: number;
	ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '4:5' | '5:4';
}
export interface OpenAPIEstimateVideoCreditsResponse {
	tokens: number;
	credits: number;
}

// --- PixVerse Video Generation ---
export type OpenAPIPixVerseModel = 'pixverse' | 'v6' | 'v5' | 'v4.5';
export type OpenAPIPixVerseLanguage = 'zh' | 'en';
export type OpenAPIPixVerseCapability =
	| 'text_to_video'
	| 'image_to_video'
	| 'transition'
	| 'multi_transition'
	| 'fusion'
	| 'restyle'
	| 'mimic'
	| 'lip_sync'
	| 'agent';
export type OpenAPIPixVerseQuality = '360p' | '540p' | '720p' | '1080p';
export type OpenAPIPixVerseAspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';
export type OpenAPIPixVerseAgentType = 'ad_master' | 'promo_mix';
export interface OpenAPIPixVerseAsset {
	url: string;
	duration?: number;
}
export interface OpenAPIPixVerseOptions {
	agentType?: OpenAPIPixVerseAgentType;
	motionMode?: string;
	cameraMovement?: string;
	templateId?: string | number;
	sourceVideoId?: string | number;
	restyleId?: string | number;
	multiTransition?: Array<{imageUrl: string; duration: number; prompt: string}>;
	imageReferences?: Array<{type: 'subject' | 'background'; imageUrl: string; refName: string}>;
	tts?: {speakerId: string; content: string};
	soundEffectSwitch?: boolean;
	soundEffectContent?: string;
	lipSyncTtsSwitch?: boolean;
	lipSyncTtsSpeakerId?: string;
	lipSyncTtsContent?: string;
	brandSticker?: {
		imageUrl: string;
		position:
			| 'up'
			| 'down'
			| 'left'
			| 'right'
			| 'upper_left'
			| 'lower_left'
			| 'upper_right'
			| 'lower_right';
	};
	introOutroClip?: {videoUrl: string; position: 'start' | 'end'};
}
export interface OpenAPICreatePixVerseVideoParams {
	capability: OpenAPIPixVerseCapability;
	model?: OpenAPIPixVerseModel;
	language?: OpenAPIPixVerseLanguage;
	prompt?: string;
	duration?: number;
	aspectRatio?: OpenAPIPixVerseAspectRatio;
	quality?: OpenAPIPixVerseQuality;
	sourceTaskId?: string;
	images?: OpenAPIPixVerseAsset[];
	videos?: OpenAPIPixVerseAsset[];
	audios?: OpenAPIPixVerseAsset[];
	pixverse?: OpenAPIPixVerseOptions;
}
export interface OpenAPICreatePixVerseVideoResponse {
	taskId: string;
	episodeId?: string;
	status: 'generating';
}
export interface OpenAPIEstimatePixVerseCreditsParams {
	capability: OpenAPIPixVerseCapability;
	model?: OpenAPIPixVerseModel;
	language?: OpenAPIPixVerseLanguage;
	duration?: number;
	quality?: OpenAPIPixVerseQuality;
	pixverse?: {
		agentType?: OpenAPIPixVerseAgentType;
		soundEffectSwitch?: boolean;
		lipSyncTtsSwitch?: boolean;
		sourceDuration?: number;
		inputAudioDuration?: number;
		multiTransition?: Array<{duration: number}>;
		tts?: {content: string};
	};
}

// --- Content Extract ---
export interface OpenAPICreateContentExtractParams {
	source: {type: 'url'; uri: string};
	options?: {summarize?: boolean; maxLength?: number; twitter?: {count?: number}};
}
export interface OpenAPIContentExtractDetail {
	taskId: string;
	status: 'processing' | 'completed' | 'failed';
	createdAt?: number;
	data?: {content?: string; metadata?: Record<string, unknown>; references?: unknown[]};
	credits?: number;
	failCode?: number;
	message?: string;
}

// --- User ---
export interface OpenAPISubscriptionInfo {
	totalAvailableCredits: number;
	subscriptionStartedAt?: number;
	subscriptionExpiresAt?: number;
	usageAvailableMonthlyCredits?: number;
	usageTotalMonthlyCredits?: number;
	usageAvailablePermanentCredits?: number;
	usageTotalPermanentCredits?: number;
	usageAvailableLimitedTimeCredits?: number;
	resetAt?: number;
	platform?: string;
	renewStatus?: boolean;
	paidStatus?: boolean;
	subscriptionPlan?: {name?: string; duration?: string; platform?: string};
}

// --- Speakers ---
export interface OpenAPISpeaker {
	name: string;
	speakerId: string;
	demoAudioUrl: string;
	gender: string;
	language: string;
	profile?: {
		pitch?: string[];
		speed?: string[];
		traits?: string[];
		styles?: string[];
		scenes?: string[];
		accent?: string;
		description?: string;
		descriptionLocalized?: Record<string, string>;
	};
}
export interface OpenAPIListSpeakersParams {
	language?: string;
	status?: number;
}
export interface OpenAPIListSpeakersResponse {
	items: OpenAPISpeaker[];
}
