import {createHttpClient, type KyInstance} from './client.js';
import type {ClientOptions} from './types/client.js';
import type {ConnectInitResponse, TokenResponse} from './types/auth.js';
import type {CheckinResponse, CheckinStatusResponse} from './types/checkin.js';
import type {ApiKeyResponse} from './types/settings.js';

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
}
