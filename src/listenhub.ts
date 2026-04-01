import {createHttpClient, type KyInstance} from './client.js';
import type {ClientOptions} from './types/client.js';
import type {ConnectInitResponse, TokenResponse} from './types/auth.js';
import type {CheckinResponse, CheckinStatusResponse} from './types/checkin.js';
import type {ApiKeyResponse} from './types/settings.js';
import type {
	CreatePodcastParams,
	CreateSpeechParams,
	CreateExplainerVideoParams,
	CreateSlidesParams,
	CreateEpisodeResponse,
	ListEpisodesParams,
	ListEpisodesResponse,
	EpisodeDetail,
	DeleteEpisodesParams,
} from './types/episodes.js';
import type {UserProfile, SubscriptionInfo} from './types/users.js';
import type {SettingsResponse, UpdateEpisodeConfigParams} from './types/settings.js';
import type {ListSpeakersParams, ListSpeakersResponse} from './types/speakers.js';

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
		return this.api
			.post('v1/episodes/all-in-one', {json: params})
			.json<CreateEpisodeResponse>();
	}

	async createSpeech(params: CreateSpeechParams): Promise<CreateEpisodeResponse> {
		return this.api
			.post('v1/episodes/flow-speech', {json: params})
			.json<CreateEpisodeResponse>();
	}

	async createExplainerVideo(params: CreateExplainerVideoParams): Promise<CreateEpisodeResponse> {
		return this.api
			.post('v1/episodes/storybook', {json: params})
			.json<CreateEpisodeResponse>();
	}

	async createSlides(params: CreateSlidesParams): Promise<CreateEpisodeResponse> {
		return this.api
			.post('v1/episodes/storybook', {json: params})
			.json<CreateEpisodeResponse>();
	}

	// --- Episodes ---

	async listEpisodes(params: ListEpisodesParams = {}): Promise<ListEpisodesResponse> {
		return this.api
			.get('v1/episodes', {searchParams: params as Record<string, string | number | boolean | undefined>})
			.json<ListEpisodesResponse>();
	}

	async getEpisode(episodeId: string): Promise<EpisodeDetail> {
		return this.api
			.get(`v5/episodes/${episodeId}/detail`)
			.json<EpisodeDetail>();
	}

	async deleteEpisodes(params: DeleteEpisodesParams): Promise<void> {
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

	async updateEpisodeConfig(params: UpdateEpisodeConfigParams): Promise<void> {
		await this.api.post('v1/settings/episode-config', {json: params});
	}

	// --- Speakers ---

	async listSpeakers(params: ListSpeakersParams = {}): Promise<ListSpeakersResponse> {
		return this.api
			.get('v1/settings/speakers', {searchParams: params as Record<string, string | number | boolean | undefined>})
			.json<ListSpeakersResponse>();
	}
}
