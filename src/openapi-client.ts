import ky from 'ky';
import {ListenHubError} from './errors.js';
import {parseErrorResponse} from './client.js';
import type {
	OpenAPIClientOptions,
	OpenAPICreateEpisodeResponse,
	OpenAPICreateTextContentResponse,
	OpenAPICreateFlowSpeechParams,
	OpenAPICreateFlowSpeechTTSParams,
	OpenAPIFlowSpeechDetail,
	OpenAPICreatePodcastParams,
	OpenAPIPodcastDetail,
	OpenAPIGenerateAudioParams,
	OpenAPIGenerateAudioResponse,
	OpenAPISpeechParams,
	OpenAPISpeechResponse,
	OpenAPITTSParams,
	OpenAPICreateStorybookParams,
	OpenAPIStorybookDetail,
	OpenAPICreateImageParams,
	OpenAPICreateImageResponse,
	OpenAPICreateVideoGenerationParams,
	OpenAPICreateVideoGenerationResponse,
	OpenAPIVideoGenerationTaskDetail,
	OpenAPIListVideoGenerationTasksParams,
	OpenAPIListVideoGenerationTasksResponse,
	OpenAPIEstimateVideoCreditsParams,
	OpenAPIEstimateVideoCreditsResponse,
	OpenAPICreateContentExtractParams,
	OpenAPIContentExtractDetail,
	OpenAPISubscriptionInfo,
	OpenAPIListSpeakersParams,
	OpenAPIListSpeakersResponse,
} from './types/openapi.js';

const DEFAULT_OPENAPI_BASE_URL = 'https://api.marswave.ai/openapi';

export class OpenAPIClient {
	private api: typeof ky;

	constructor(opts: OpenAPIClientOptions = {}) {
		const effectiveApiKey = opts.apiKey || process.env['LISTENHUB_API_KEY'];
		if (!effectiveApiKey) {
			throw new Error(
				'OpenAPIClient requires an apiKey option or LISTENHUB_API_KEY environment variable',
			);
		}

		const baseURL =
			opts.baseURL || process.env['LISTENHUB_OPENAPI_URL'] || DEFAULT_OPENAPI_BASE_URL;

		this.api = ky.create({
			prefixUrl: baseURL,
			timeout: opts.timeout ?? 60_000,
			retry: {
				limit: opts.maxRetries ?? 2,
				methods: ['get', 'post', 'put', 'patch', 'delete'],
				statusCodes: [429],
				shouldRetry({error}) {
					if (error instanceof ListenHubError && error.status === 429) return true;
					if (error instanceof ListenHubError) return false;
					return undefined as unknown as boolean;
				},
			},
			hooks: {
				beforeRequest: [
					async (request) => {
						request.headers.set('Authorization', `Bearer ${effectiveApiKey}`);
					},
				],
				afterResponse: [
					async (_request, _options, response) => {
						if (!response.ok) return;
						if (response.status === 204) return;
						if (!response.headers.get('content-type')?.includes('application/json')) return;

						const body = await response.clone().json();

						if (typeof body.code !== 'number') return;

						if (body.code !== 0) {
							throw new ListenHubError({
								status: response.status,
								code: String(body.code),
								message: body.message ?? `Error ${body.code}`,
								requestId: body.request_id,
							});
						}

						return new Response(JSON.stringify(body.data), {
							status: response.status,
							headers: response.headers,
						});
					},

					async (_request, _options, response) => {
						if (response.ok || response.status === 429) return;
						throw await parseErrorResponse(response.clone());
					},
				],
				beforeError: [
					async (error) => {
						throw await parseErrorResponse(error.response.clone());
					},
				],
			},
		});
	}

	// --- Speakers ---
	async listSpeakers(params?: OpenAPIListSpeakersParams): Promise<OpenAPIListSpeakersResponse> {
		return this.api.get('v1/speakers/list', {searchParams: params as any}).json();
	}

	// --- Flow Speech ---
	async createFlowSpeech(
		params: OpenAPICreateFlowSpeechParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/flow-speech/episodes', {json: params}).json();
	}
	async getFlowSpeech(episodeId: string): Promise<OpenAPIFlowSpeechDetail> {
		return this.api.get(`v1/flow-speech/episodes/${episodeId}`).json();
	}
	async getFlowSpeechTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
		return this.api.get(`v1/flow-speech/episodes/${episodeId}/text-stream`, {
			searchParams: {event},
		});
	}
	async createFlowSpeechTTS(
		params: OpenAPICreateFlowSpeechTTSParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/flow-speech/episodes/tts', {json: params}).json();
	}

	// --- Podcast ---
	async createPodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/podcast/episodes', {json: params}).json();
	}
	async getPodcast(episodeId: string): Promise<OpenAPIPodcastDetail> {
		return this.api.get(`v1/podcast/episodes/${episodeId}`).json();
	}
	async getPodcastTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
		return this.api.get(`v1/podcast/episodes/${episodeId}/text-stream`, {searchParams: {event}});
	}
	async createPodcastTextContent(
		params: OpenAPICreatePodcastParams,
	): Promise<OpenAPICreateTextContentResponse> {
		return this.api.post('v1/podcast/episodes/text-content', {json: params}).json();
	}
	async generatePodcastAudio(
		episodeId: string,
		params?: OpenAPIGenerateAudioParams,
	): Promise<OpenAPIGenerateAudioResponse> {
		return this.api.post(`v1/podcast/episodes/${episodeId}/audio`, {json: params ?? {}}).json();
	}

	// --- TTS ---
	async speech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse> {
		return this.api.post('v1/speech', {json: params}).json();
	}
	async tts(params: OpenAPITTSParams): Promise<Response> {
		return this.api.post('v1/tts', {json: params});
	}
	async audioSpeech(params: OpenAPITTSParams): Promise<Response> {
		return this.api.post('v1/audio/speech', {json: params});
	}

	// --- Storybook ---
	async createStorybook(
		params: OpenAPICreateStorybookParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/storybook/episodes', {json: params}).json();
	}
	async getStorybook(episodeId: string): Promise<OpenAPIStorybookDetail> {
		return this.api.get(`v1/storybook/episodes/${episodeId}`).json();
	}
	async generateStorybookVideo(episodeId: string): Promise<{success: boolean}> {
		return this.api.post(`v1/storybook/episodes/${episodeId}/video`, {json: {}}).json();
	}

	// --- Image ---
	async createImage(params: OpenAPICreateImageParams): Promise<OpenAPICreateImageResponse> {
		return this.api.post('v1/images/generation', {json: params}).json();
	}

	// --- Video Generation ---
	async createVideoGeneration(
		params: OpenAPICreateVideoGenerationParams,
	): Promise<OpenAPICreateVideoGenerationResponse> {
		return this.api.post('v1/video-generation/generate', {json: params}).json();
	}
	async getVideoGenerationTask(taskId: string): Promise<OpenAPIVideoGenerationTaskDetail> {
		return this.api.get(`v1/video-generation/tasks/${taskId}`).json();
	}
	async listVideoGenerationTasks(
		params?: OpenAPIListVideoGenerationTasksParams,
	): Promise<OpenAPIListVideoGenerationTasksResponse> {
		return this.api.get('v1/video-generation/tasks', {searchParams: params as any}).json();
	}
	async estimateVideoCredits(
		params: OpenAPIEstimateVideoCreditsParams,
	): Promise<OpenAPIEstimateVideoCreditsResponse> {
		return this.api.post('v1/video-generation/estimate-credits', {json: params}).json();
	}

	// --- Content Extract ---
	async createContentExtract(params: OpenAPICreateContentExtractParams): Promise<{taskId: string}> {
		return this.api.post('v1/content/extract', {json: params}).json();
	}
	async getContentExtract(taskId: string): Promise<OpenAPIContentExtractDetail> {
		return this.api.get(`v1/content/extract/${taskId}`).json();
	}

	// --- User ---
	async getSubscription(): Promise<OpenAPISubscriptionInfo> {
		return this.api.get('v1/user/subscription').json();
	}
}
