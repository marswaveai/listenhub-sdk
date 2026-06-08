import {createHttpClient, type KyInstance} from './client.js';
import {appendMusicField} from './music-form.js';
import type {ClientOptions} from './types/client.js';
import type {ConnectInitResponse, TokenResponse} from './types/auth.js';
import type {CheckinResponse, CheckinStatusResponse} from './types/checkin.js';
import type {ApiKeyResponse} from './types/settings.js';
import type {
	CreatePodcastParams,
	CreateTTSParams,
	CreateExplainerVideoParams,
	CreateSlidesParams,
	CreateEpisodeResponse,
	ListEpisodesParams,
	ListEpisodesResponse,
	ProductId,
	EpisodeDetail,
	DeleteEpisodesParams,
} from './types/episodes.js';
import type {UserProfile, SubscriptionInfo} from './types/users.js';
import type {SettingsResponse} from './types/settings.js';
import type {ListSpeakersParams, ListSpeakersResponse} from './types/speakers.js';
import type {
	CreateAIImageParams,
	CreateAIImageResponse,
	AIImageItem,
	ListAIImagesParams,
	ListAIImagesResponse,
} from './types/images.js';
import type {
	CreateMusicGenerateParams,
	CreateMusicCoverParams,
	CreateMusicExtendParams,
	CreateMusicRemixParams,
	CreateMusicInstrumentalParams,
	CreateMusicSoundtrackParams,
	CreateMusicTrackParams,
	RecognizeMusicParams,
	RecognizeMusicResponse,
	DescribeMusicParams,
	DescribeMusicResponse,
	StemMusicParams,
	StemMusicResponse,
	CreateMusicTaskResponse,
	MusicTaskDetail,
	ListMusicTasksParams,
	ListMusicTasksResponse,
} from './types/music.js';
import type {
	CreateFileUploadParams,
	CreateFileUploadResponse,
	GetFileDownloadUrlResponse,
} from './types/files.js';
import type {
	CreateLyricsParams,
	CreateLyricsTaskResponse,
	LyricsTaskDetail,
	ListLyricsTasksParams,
	ListLyricsTasksResponse,
} from './types/lyrics.js';
import type {
	CreateVideoGenerationParams,
	CreateVideoGenerationResponse,
	VideoGenerationTaskDetail,
	ListVideoGenerationTasksParams,
	ListVideoGenerationTasksResponse,
	EstimateVideoGenerationCreditsParams,
	EstimateVideoGenerationCreditsResponse,
} from './types/video-generation.js';

export class ListenHubClient {
	public readonly api: KyInstance;

	constructor(options: ClientOptions = {}) {
		this.api = createHttpClient(options);
	}

	// --- Auth ---

	async refresh(params: {refreshToken: string}): Promise<TokenResponse> {
		return this.api
			.post('v1/auth/token', {
				json: {grantType: 'refresh_token', refreshToken: params.refreshToken},
			})
			.json<TokenResponse>();
	}

	async connectInit(params: {callbackPort: number}): Promise<ConnectInitResponse> {
		return this.api.post('v1/auth/connect/init', {json: params}).json<ConnectInitResponse>();
	}

	async connectToken(params: {sessionId: string; code: string}): Promise<TokenResponse> {
		return this.api.post('v1/auth/connect/token', {json: params}).json<TokenResponse>();
	}

	async revoke(params: {refreshToken: string}): Promise<void> {
		await this.api.post('v1/auth/token/revoke', {json: params});
	}

	// --- Checkin ---

	async checkinSubmit(): Promise<CheckinResponse> {
		return this.api.post('v1/checkin', {json: {platform: 'listenhub'}}).json<CheckinResponse>();
	}

	async checkinStatus(): Promise<CheckinStatusResponse> {
		return this.api.get('v1/checkin/status').json<CheckinStatusResponse>();
	}

	// --- Settings ---

	async getApiKey(): Promise<ApiKeyResponse> {
		return this.api.get('v1/settings/api-key').json<ApiKeyResponse>();
	}

	async regenerateApiKey(): Promise<ApiKeyResponse> {
		return this.api.post('v1/settings/api-key/regenerate').json<ApiKeyResponse>();
	}

	// --- Content Creation ---

	async createPodcast(params: CreatePodcastParams): Promise<CreateEpisodeResponse> {
		return this.api.post('v1/episodes/all-in-one', {json: params}).json<CreateEpisodeResponse>();
	}

	async createTTS(params: CreateTTSParams): Promise<CreateEpisodeResponse> {
		return this.api.post('v1/episodes/flow-speech', {json: params}).json<CreateEpisodeResponse>();
	}

	async createExplainerVideo(params: CreateExplainerVideoParams): Promise<CreateEpisodeResponse> {
		return this.api.post('v1/episodes/storybook', {json: params}).json<CreateEpisodeResponse>();
	}

	async exportExplainerVideo(episodeId: string): Promise<void> {
		await this.api.post(`v1/episodes/${episodeId}/storybook/video`, {
			json: {},
		});
	}

	async createSlides(params: CreateSlidesParams): Promise<CreateEpisodeResponse> {
		return this.api
			.post('v1/episodes/storybook', {json: {mode: 'slides', skipAudio: true, ...params}})
			.json<CreateEpisodeResponse>();
	}

	// --- List by product ---

	private listByProduct(
		productId: ProductId,
		params: ListEpisodesParams = {},
	): Promise<ListEpisodesResponse> {
		return this.api
			.get('v1/episodes', {
				searchParams: {...params, productId} as Record<string, string | number | boolean>,
			})
			.json<ListEpisodesResponse>();
	}

	async listPodcasts(params: ListEpisodesParams = {}): Promise<ListEpisodesResponse> {
		return this.listByProduct('aiPodcast', params);
	}

	async listTTS(params: ListEpisodesParams = {}): Promise<ListEpisodesResponse> {
		return this.listByProduct('textToSpeech', params);
	}

	async listExplainerVideos(params: ListEpisodesParams = {}): Promise<ListEpisodesResponse> {
		return this.listByProduct('explainerVideo', params);
	}

	async listSlides(params: ListEpisodesParams = {}): Promise<ListEpisodesResponse> {
		return this.listByProduct('slideDeck', params);
	}

	async getCreation(episodeId: string): Promise<EpisodeDetail> {
		return this.api.get(`v5/episodes/${episodeId}/detail`).json<EpisodeDetail>();
	}

	async deleteCreations(params: DeleteEpisodesParams): Promise<void> {
		await this.api.delete('v1/episodes', {json: params});
	}

	// --- Users ---

	async getCurrentUser(): Promise<UserProfile> {
		return this.api.get('v1/users/me').json<UserProfile>();
	}

	async getSubscription(): Promise<SubscriptionInfo> {
		return this.api.get('v1/users/subscription').json<SubscriptionInfo>();
	}

	// --- Settings ---

	async getSettings(): Promise<SettingsResponse> {
		return this.api.get('v2/settings').json<SettingsResponse>();
	}

	// --- Speakers ---

	async listSpeakers(params: ListSpeakersParams = {}): Promise<ListSpeakersResponse> {
		return this.api
			.get('v1/settings/speakers', {
				searchParams: params as Record<string, string | number | boolean | undefined>,
			})
			.json<ListSpeakersResponse>();
	}

	// --- Images ---

	async listAIImages(params: ListAIImagesParams = {}): Promise<ListAIImagesResponse> {
		return this.api
			.get('v1/images', {
				searchParams: params as Record<string, string | number | boolean>,
			})
			.json<ListAIImagesResponse>();
	}

	async getAIImage(imageId: string): Promise<AIImageItem> {
		return this.api.get(`v1/images/${imageId}`).json<AIImageItem>();
	}

	async createAIImage(params: CreateAIImageParams): Promise<CreateAIImageResponse> {
		return this.api.post('v1/images', {json: params}).json<CreateAIImageResponse>();
	}

	// --- Music ---

	async createMusicGenerate(params: CreateMusicGenerateParams): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/generate', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	async createMusicCover(params: CreateMusicCoverParams): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/cover', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	async createMusicExtend(params: CreateMusicExtendParams): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/extend', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	async getMusicTask(taskId: string): Promise<MusicTaskDetail> {
		return this.api.get(`v1/music/tasks/${taskId}`).json<MusicTaskDetail>();
	}

	async listMusicTasks(params: ListMusicTasksParams = {}): Promise<ListMusicTasksResponse> {
		return this.api
			.get('v1/music/tasks', {
				searchParams: params as Record<string, string | number | boolean>,
			})
			.json<ListMusicTasksResponse>();
	}

	/** Remix an existing song with new lyrics (Mureka). Async — poll via getMusicTask. */
	async createMusicRemix(params: CreateMusicRemixParams): Promise<CreateMusicTaskResponse> {
		const form = new FormData();
		if (params.audio) form.append('audio', params.audio, params.audioFilename ?? 'audio.mp3');
		appendMusicField(form, 'audioUrl', params.audioUrl);
		appendMusicField(form, 'providerSongId', params.providerSongId);
		appendMusicField(form, 'lyrics', params.lyrics);
		appendMusicField(form, 'prompt', params.prompt);
		return this.api.post('v1/music/remix', {body: form}).json<CreateMusicTaskResponse>();
	}

	/** Generate a standalone instrumental (Mureka). prompt XOR referenceAudio. Async. */
	async createMusicInstrumental(
		params: CreateMusicInstrumentalParams,
	): Promise<CreateMusicTaskResponse> {
		const form = new FormData();
		if (params.referenceAudio) {
			form.append('referenceAudio', params.referenceAudio, params.referenceAudioFilename ?? 'reference.mp3');
		}
		appendMusicField(form, 'prompt', params.prompt);
		appendMusicField(form, 'model', params.model);
		return this.api.post('v1/music/instrumental', {body: form}).json<CreateMusicTaskResponse>();
	}

	/** Generate music from an image or video (Mureka). image XOR video. Async. */
	async createMusicSoundtrack(
		params: CreateMusicSoundtrackParams,
	): Promise<CreateMusicTaskResponse> {
		const form = new FormData();
		if (params.image) form.append('image', params.image, params.imageFilename ?? 'image.png');
		if (params.video) form.append('video', params.video, params.videoFilename ?? 'video.mp4');
		appendMusicField(form, 'prompt', params.prompt);
		appendMusicField(form, 'model', params.model);
		return this.api.post('v1/music/soundtrack', {body: form}).json<CreateMusicTaskResponse>();
	}

	/** Generate a single instrument/vocal track (Mureka). audio XOR providerSongId. Async. */
	async createMusicTrack(params: CreateMusicTrackParams): Promise<CreateMusicTaskResponse> {
		const form = new FormData();
		if (params.audio) form.append('audio', params.audio, params.audioFilename ?? 'audio.mp3');
		appendMusicField(form, 'providerSongId', params.providerSongId);
		appendMusicField(form, 'generateType', params.generateType);
		appendMusicField(form, 'prompt', params.prompt);
		appendMusicField(form, 'lyrics', params.lyrics);
		appendMusicField(form, 'vocalGender', params.vocalGender);
		appendMusicField(form, 'generateStart', params.generateStart);
		appendMusicField(form, 'generateEnd', params.generateEnd);
		return this.api.post('v1/music/track', {body: form}).json<CreateMusicTaskResponse>();
	}

	/** Recognize lyrics (with timestamps) from audio (Mureka). Synchronous. */
	async recognizeMusic(params: RecognizeMusicParams): Promise<RecognizeMusicResponse> {
		const form = new FormData();
		form.append('audio', params.audio, params.audioFilename ?? 'audio.mp3');
		return this.api.post('v1/music/recognize', {body: form}).json<RecognizeMusicResponse>();
	}

	/** Analyze audio — description, tags, genres, instruments (Mureka). Synchronous. */
	async describeMusic(params: DescribeMusicParams): Promise<DescribeMusicResponse> {
		const form = new FormData();
		form.append('audio', params.audio, params.audioFilename ?? 'audio.mp3');
		return this.api.post('v1/music/describe', {body: form}).json<DescribeMusicResponse>();
	}

	/** Separate audio into stems (Mureka). Synchronous — returns download URLs. */
	async stemMusic(params: StemMusicParams): Promise<StemMusicResponse> {
		const form = new FormData();
		form.append('audio', params.audio, params.audioFilename ?? 'audio.mp3');
		appendMusicField(form, 'model', params.model);
		return this.api.post('v1/music/stem', {body: form}).json<StemMusicResponse>();
	}

	// --- Files ---

	async createFileUpload(params: CreateFileUploadParams): Promise<CreateFileUploadResponse> {
		return this.api.post('v1/files', {json: params}).json<CreateFileUploadResponse>();
	}

	async getFileDownloadUrl(fileUrl: string): Promise<GetFileDownloadUrlResponse> {
		return this.api.get('v1/files', {searchParams: {fileUrl}}).json<GetFileDownloadUrlResponse>();
	}

	// --- Lyrics ---

	async createLyrics(params: CreateLyricsParams): Promise<CreateLyricsTaskResponse> {
		return this.api.post('v1/lyrics/generate', {json: params}).json<CreateLyricsTaskResponse>();
	}

	async getLyricsTask(taskId: string): Promise<LyricsTaskDetail> {
		return this.api.get(`v1/lyrics/tasks/${taskId}`).json<LyricsTaskDetail>();
	}

	async listLyricsTasks(params: ListLyricsTasksParams = {}): Promise<ListLyricsTasksResponse> {
		return this.api
			.get('v1/lyrics/tasks', {
				searchParams: params as Record<string, string | number | boolean>,
			})
			.json<ListLyricsTasksResponse>();
	}

	// --- Video Generation ---

	async createVideoGeneration(
		params: CreateVideoGenerationParams,
	): Promise<CreateVideoGenerationResponse> {
		return this.api
			.post('v1/video-generation/generate', {json: params})
			.json<CreateVideoGenerationResponse>();
	}

	async getVideoGenerationTask(taskId: string): Promise<VideoGenerationTaskDetail> {
		return this.api.get(`v1/video-generation/tasks/${taskId}`).json<VideoGenerationTaskDetail>();
	}

	async listVideoGenerationTasks(
		params: ListVideoGenerationTasksParams = {},
	): Promise<ListVideoGenerationTasksResponse> {
		return this.api
			.get('v1/video-generation/tasks', {
				searchParams: params as Record<string, string | number | boolean>,
			})
			.json<ListVideoGenerationTasksResponse>();
	}

	async estimateVideoGenerationCredits(
		params: EstimateVideoGenerationCreditsParams,
	): Promise<EstimateVideoGenerationCreditsResponse> {
		return this.api
			.post('v1/video-generation/estimate-credits', {json: params})
			.json<EstimateVideoGenerationCreditsResponse>();
	}
}
