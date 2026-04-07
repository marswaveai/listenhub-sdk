import {createHttpClient, type KyInstance} from './client.js';
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
			.post('v1/episodes/storybook', {json: {skipAudio: true, ...params}})
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

	async createMusicGenerate(
		params: CreateMusicGenerateParams,
	): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/generate', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	async createMusicCover(
		params: CreateMusicCoverParams,
	): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/cover', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	async getMusicTask(taskId: string): Promise<MusicTaskDetail> {
		return this.api.get(`v1/music/tasks/${taskId}`).json<MusicTaskDetail>();
	}

	async listMusicTasks(
		params: ListMusicTasksParams = {},
	): Promise<ListMusicTasksResponse> {
		return this.api
			.get('v1/music/tasks', {
				searchParams: params as Record<string, string | number | boolean>,
			})
			.json<ListMusicTasksResponse>();
	}

	// --- Files ---

	async createFileUpload(
		params: CreateFileUploadParams,
	): Promise<CreateFileUploadResponse> {
		return this.api
			.post('v1/files', {json: params})
			.json<CreateFileUploadResponse>();
	}

	async getFileDownloadUrl(fileUrl: string): Promise<GetFileDownloadUrlResponse> {
		return this.api
			.get('v1/files', {searchParams: {fileUrl}})
			.json<GetFileDownloadUrlResponse>();
	}
}
