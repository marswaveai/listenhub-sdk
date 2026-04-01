// --- Shared base types ---

export type Language = 'en' | 'zh' | 'ja';

export interface UrlSourceMetadata {
	title?: string;
	ogTitle?: string;
	faviconUrl?: string;
	ogImageUrl?: string;
	ogSiteName?: string;
}

export interface ContentSource {
	type: 'url' | 'text';
	uri?: string;
	content?: string;
	metadata?: UrlSourceMetadata;
}

export interface EpisodeSpeaker {
	name: string;
	speakerInnerId: string;
	gender: string;
}

export interface EpisodeCreator {
	nickname: string;
	avatar: string;
}

// --- Create responses ---

export interface CreateEpisodeResponse {
	episodeId: string;
}

// --- Create params ---

export interface CreatePodcastParams {
	type: 'podcast-solo' | 'podcast-duo';
	query?: string;
	sources?: ContentSource[];
	template: {
		type: 'podcast';
		mode: 'quick' | 'deep' | 'debate';
		speakers: string[];
		language: Language;
	};
}

export interface CreateTTSParams {
	sources: ContentSource[];
	template: {
		type: 'flowspeech';
		mode: 'smart' | 'direct';
		speakers: string[];
		language: Language;
	};
}

export type ImageSize = '2K' | '4K';
export type ImageAspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '2:3' | '3:2' | '3:4' | '21:9';
export type SlideAspectRatio = '16:9';

export interface CreateExplainerVideoParams {
	query?: string;
	sources?: ContentSource[];
	style?: string;
	styleOverride?: string;
	imageConfig?: {
		size: ImageSize;
		aspectRatio: ImageAspectRatio;
	};
	template: {
		type: 'storybook';
		mode: 'info' | 'story';
		speakers: string[];
		language: Language;
		style?: string;
		size?: ImageSize;
		aspectRatio?: ImageAspectRatio;
		pageCount?: number;
	};
}

export interface CreateSlidesParams {
	query?: string;
	sources?: ContentSource[];
	style?: string;
	styleOverride?: string;
	imageConfig?: {
		size: ImageSize;
		aspectRatio: SlideAspectRatio;
	};
	template: {
		type: 'storybook';
		mode: 'slides';
		speakers: string[];
		language: Language;
		style?: string;
		size?: ImageSize;
		aspectRatio?: SlideAspectRatio;
		pageCount?: number;
	};
}

// --- List / Detail ---

export interface EpisodeImageConfig {
	size: string;
	aspectRatio: string;
}

export interface EpisodeInput {
	query?: string;
	sources: ContentSource[];
}

export interface EpisodeItem {
	id: string;
	type: string;
	status: string;
	title: string;
	summary: string;
	cover: string;
	audioUrl: string;
	audioDuration: number;
	videoUrl: string;
	input: EpisodeInput;
	inputSources: ContentSource[];
	processStatus: string;
	stepStatus: string;
	failCode: number;
	playedStatus: number;
	slidesStatus: string;
	creator: EpisodeCreator;
	playCount: number;
	generationType: string;
	enabledShare: boolean;
	mode: string;
	speakers: EpisodeSpeaker[];
	language: string;
	imageConfig?: EpisodeImageConfig;
	createdAt: number;
}

export interface ListEpisodesParams {
	page?: number;
	pageSize?: number;
	productId?: string;
}

export interface ListEpisodesResponse {
	items: EpisodeItem[];
	pagination: {
		page: number;
		pageSize: number;
		total?: number;
	};
}

export interface EpisodeDetailTopicData<T> {
	inputType: string;
	data: T;
}

export interface EpisodeDetailAudio {
	audioUrl: string;
	audioDuration: number;
	audioHlsUrl: string;
}

export interface EpisodeDetailVideo {
	videoUrl: string;
	videoStatus: string;
}

export interface EpisodeDetailPage {
	text: string;
	pageNumber: number;
	imageUrl: string;
	audioTimestamp: number;
}

export interface EpisodeDetailReference {
	type: string;
	url_citation: {
		title: string;
		exactQuote: string;
		url: string;
		dateTime: string;
		favicon: string;
	};
}

export interface EpisodeDetailPreprocess {
	deepsearchEnabled: boolean;
	content: string;
	references: EpisodeDetailReference[];
}

export interface EpisodeDetailScript {
	content: string;
	speakerInnerId: string;
}

export interface EpisodeDetailSeoMeta {
	keywords: string;
	meta_description: string;
}

export interface EpisodeDetail {
	id: string;
	generationType: string;
	generationMode: string;
	sseEvent: string[];
	ownerMatch: boolean;
	sourceType: string;
	createdAt: number;
	completedAt: number;
	enabledShare: boolean;
	playedStatus: number;
	creator: EpisodeCreator;
	playCount: number;
	input: {
		query?: string;
		sources: Array<{
			type: string;
			uri?: string;
			content: string;
			scrapeStatus?: boolean;
			metadata?: Record<string, unknown>;
		}>;
	};
	credits: number;
	failCode: number;
	processStatus: string;
	language: string;
	speakers: EpisodeSpeaker[];
	topicDetail: {
		title: EpisodeDetailTopicData<string>;
		outline: EpisodeDetailTopicData<string>;
		cover: EpisodeDetailTopicData<string>;
		audio: EpisodeDetailTopicData<EpisodeDetailAudio>;
		video: EpisodeDetailTopicData<EpisodeDetailVideo>;
		pages: EpisodeDetailTopicData<EpisodeDetailPage[]>;
		preprocessResult: EpisodeDetailTopicData<EpisodeDetailPreprocess>;
		scripts: EpisodeDetailTopicData<EpisodeDetailScript[]>;
		seoMeta: EpisodeDetailTopicData<EpisodeDetailSeoMeta>;
		slides: EpisodeDetailTopicData<{slidesUrl: string; slidesStatus: string}>;
		resource?: EpisodeDetailTopicData<{resourceUrl?: string; resourceStatus: string}>;
	};
}

export interface DeleteEpisodesParams {
	ids: string[];
}
