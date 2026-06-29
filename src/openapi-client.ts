import ky from 'ky';
import {ListenHubError} from './errors.js';
import {parseErrorResponse} from './client.js';
import {appendMusicField} from './music-form.js';
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
	OpenAPICreateSeedAudioParams,
	OpenAPICreateSeedAudioResponse,
	OpenAPISeedAudioTaskDetail,
	OpenAPIListSeedAudioTasksParams,
	OpenAPIListSeedAudioTasksResponse,
	OpenAPIEstimateVideoCreditsParams,
	OpenAPIEstimateVideoCreditsResponse,
	OpenAPICreatePixVerseVideoParams,
	OpenAPICreatePixVerseVideoResponse,
	OpenAPIEstimatePixVerseCreditsParams,
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
		return this.api
			.get('v1/speakers/list', {
				searchParams: params as Record<string, string | number | boolean | undefined>,
			})
			.json();
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
		return this.api
			.get('v1/video-generation/tasks', {
				searchParams: params as Record<string, string | number | boolean | undefined>,
			})
			.json();
	}
	async estimateVideoCredits(
		params: OpenAPIEstimateVideoCreditsParams,
	): Promise<OpenAPIEstimateVideoCreditsResponse> {
		return this.api.post('v1/video-generation/estimate-credits', {json: params}).json();
	}
	async createPixVerseVideoGeneration(
		params: OpenAPICreatePixVerseVideoParams,
	): Promise<OpenAPICreatePixVerseVideoResponse> {
		return this.api.post('v1/video-generation/pixverse/generate', {json: params}).json();
	}
	async estimatePixVerseVideoCredits(
		params: OpenAPIEstimatePixVerseCreditsParams,
	): Promise<OpenAPIEstimateVideoCreditsResponse> {
		return this.api.post('v1/video-generation/pixverse/estimate-credits', {json: params}).json();
	}

	// --- Seed Audio ---
	async createSeedAudio(
		params: OpenAPICreateSeedAudioParams,
	): Promise<OpenAPICreateSeedAudioResponse> {
		return this.api.post('v1/seed-audio/generate', {json: params}).json();
	}
	async getSeedAudioTask(taskId: string): Promise<OpenAPISeedAudioTaskDetail> {
		return this.api.get(`v1/seed-audio/tasks/${taskId}`).json();
	}
	async listSeedAudioTasks(
		params?: OpenAPIListSeedAudioTasksParams,
	): Promise<OpenAPIListSeedAudioTasksResponse> {
		return this.api
			.get('v1/seed-audio/tasks', {
				searchParams: params as Record<string, string | number | boolean | undefined>,
			})
			.json();
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

	// --- Music ---
	// Default provider is Mureka. Async endpoints return a task; poll getMusicTask.

	async createMusicGenerate(params: CreateMusicGenerateParams): Promise<CreateMusicTaskResponse> {
		return this.api
			.post('v1/music/generate', {json: {...params, provider: 'default'}})
			.json<CreateMusicTaskResponse>();
	}

	/** @deprecated Cover is pinned to the legacy Suno provider; prefer createMusicRemix. */
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
		if (!taskId) throw new Error('getMusicTask requires a non-empty taskId');
		return this.api.get(`v1/music/tasks/${encodeURIComponent(taskId)}`).json<MusicTaskDetail>();
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
			form.append(
				'referenceAudio',
				params.referenceAudio,
				params.referenceAudioFilename ?? 'reference.mp3',
			);
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
}
