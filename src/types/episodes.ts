// --- Shared base types ---

export interface ContentSource {
	type: 'url' | 'text' | 'file' | 'episode';
	uri?: string;
	content?: string;
	metadata?: {
		title?: string;
		ogTitle?: string;
		faviconUrl?: string;
		ogImageUrl?: string;
		ogSiteName?: string;
		mimeType?: string;
		name?: string;
		size?: number;
	};
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
	query: string;
	sources?: ContentSource[];
	template: {
		type: 'podcast';
		mode: 'quick' | 'deep' | 'debate';
		speakers: string[];
		language: string;
	};
}

export interface CreateSpeechParams {
	sources: ContentSource[];
	template: {
		type: 'flowspeech';
		mode: 'smart' | 'direct';
		speakers: string[];
		language: string;
	};
}

export interface CreateExplainerVideoParams {
	query: string;
	sources?: ContentSource[];
	mode: 'info' | 'story';
	imageConfig: {
		size: '2K' | '4K';
		aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '2:3' | '3:2' | '3:4' | '21:9';
	};
	style?: string;
	skipAudio?: boolean;
	template: {
		type: 'storybook';
		mode: 'info' | 'story';
		speakers: string[];
		language: string;
		style?: string;
		size: '2K' | '4K';
		aspectRatio: '1:1' | '9:16' | '16:9' | '4:3' | '2:3' | '3:2' | '3:4' | '21:9';
		pageCount?: number;
	};
}

export interface CreateSlidesParams {
	query: string;
	sources?: ContentSource[];
	mode: 'slides';
	imageConfig: {
		size: '2K' | '4K';
		aspectRatio: '16:9';
	};
	style?: string;
	skipAudio?: boolean;
	template: {
		type: 'storybook';
		mode: 'slides';
		speakers: string[];
		language: string;
		style?: string;
		size: '2K' | '4K';
		aspectRatio: '16:9';
		pageCount?: number;
	};
}

// --- List / Detail ---

export interface EpisodeItem {
	id: string;
	type: string;
	status: string;
	title: string;
	cover: string;
	audioUrl: string;
	audioDuration: number;
	videoUrl: string;
	input: string;
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
