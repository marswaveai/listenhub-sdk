import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {OpenAPIClient} from '../../src/openapi-client';
import {ListenHubError} from '../../src/errors';

const mockFetch = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

// --- Response helpers ---

function envelopeResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function errorEnvelopeResponse(code: number, message: string, status = 200) {
	return new Response(JSON.stringify({code, message}), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function rawJsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function httpErrorJsonResponse(status: number, body: {code?: number; message?: string}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function htmlErrorResponse(status: number, title: string) {
	return new Response(`<html><head><title>${title}</title></head><body></body></html>`, {
		status,
		headers: {'content-type': 'text/html'},
	});
}

function retryExhaustedResponse() {
	return new Response(JSON.stringify({code: 42900, message: 'Rate limited'}), {
		status: 429,
		headers: {'content-type': 'application/json'},
	});
}

// --- Tests ---

describe('OpenAPIClient – constructor validation', () => {
	it('throws when no apiKey and no LISTENHUB_API_KEY env', () => {
		vi.stubEnv('LISTENHUB_API_KEY', '');
		expect(() => new OpenAPIClient()).toThrow(
			/OpenAPIClient requires an apiKey option or LISTENHUB_API_KEY environment variable/,
		);
	});

	it('constructs successfully when apiKey option is provided', () => {
		expect(() => new OpenAPIClient({apiKey: 'lh_sk_test'})).not.toThrow();
	});

	it('constructs successfully when only LISTENHUB_API_KEY env is set', () => {
		vi.stubEnv('LISTENHUB_API_KEY', 'lh_sk_from_env');
		expect(() => new OpenAPIClient()).not.toThrow();
	});
});

describe('OpenAPIClient – baseURL priority', () => {
	it('defaults to https://api.marswave.ai/openapi when no override given', async () => {
		const client = new OpenAPIClient({apiKey: 'lh_sk_test'});
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.url).toContain('https://api.marswave.ai/openapi/v1/speakers/list');
	});

	it('uses explicit baseURL option when provided', async () => {
		const client = new OpenAPIClient({
			apiKey: 'lh_sk_test',
			baseURL: 'https://custom.example.com/openapi',
		});
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.url).toContain('https://custom.example.com/openapi/v1/speakers/list');
	});

	it('uses LISTENHUB_OPENAPI_URL env when set', async () => {
		vi.stubEnv('LISTENHUB_OPENAPI_URL', 'https://env-override.example.com/openapi');
		const client = new OpenAPIClient({apiKey: 'lh_sk_test'});
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.url).toContain('https://env-override.example.com/openapi/v1/speakers/list');
	});
});

describe('OpenAPIClient – auth header', () => {
	it('includes Authorization: Bearer <apiKey> on all requests', async () => {
		const client = new OpenAPIClient({apiKey: 'lh_sk_mykey'});
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.headers.get('authorization')).toBe('Bearer lh_sk_mykey');
	});

	it('uses apiKey from env when no option given', async () => {
		vi.stubEnv('LISTENHUB_API_KEY', 'lh_sk_env_key');
		const client = new OpenAPIClient();
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.headers.get('authorization')).toBe('Bearer lh_sk_env_key');
	});
});

describe('OpenAPIClient – method calls', () => {
	let client: OpenAPIClient;

	beforeEach(() => {
		client = new OpenAPIClient({
			apiKey: 'lh_sk_test',
			baseURL: 'https://api.test.com/openapi',
		});
	});

	it('listSpeakers() → GET v1/speakers/list', async () => {
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));

		await client.listSpeakers();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('GET');
		expect(req.url).toContain('/v1/speakers/list');
	});

	it('createFlowSpeech(params) → POST v1/flow-speech/episodes with JSON body', async () => {
		const params = {
			sources: [{type: 'text' as const, content: 'Hello world'}],
			speakers: [{speakerId: 'spk_123'}],
		};
		let capturedBody: unknown;
		mockFetch.mockImplementationOnce(async (req: Request) => {
			capturedBody = await req.clone().json();
			return envelopeResponse({episodeId: 'ep_abc'});
		});

		await client.createFlowSpeech(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/flow-speech/episodes');
		expect(capturedBody).toEqual(params);
	});

	it('getFlowSpeech(id) → GET v1/flow-speech/episodes/{id}', async () => {
		mockFetch.mockResolvedValueOnce(
			envelopeResponse({episodeId: 'ep_abc', createdAt: 0, processStatus: 'done'}),
		);

		await client.getFlowSpeech('ep_abc');

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('GET');
		expect(req.url).toContain('/v1/flow-speech/episodes/ep_abc');
	});

	it('createPodcast(params) → POST v1/podcast/episodes', async () => {
		const params = {
			sources: [{type: 'url' as const, content: 'https://example.com'}],
			speakers: [{speakerId: 'spk_456'}],
		};
		let capturedBody: unknown;
		mockFetch.mockImplementationOnce(async (req: Request) => {
			capturedBody = await req.clone().json();
			return envelopeResponse({episodeId: 'ep_pod'});
		});

		await client.createPodcast(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/podcast/episodes');
		expect(capturedBody).toEqual(params);
	});

	it('speech(params) → POST v1/speech', async () => {
		const params = {scripts: [{content: 'Hello', speakerId: 'spk_1'}]};
		mockFetch.mockResolvedValueOnce(
			envelopeResponse({audioUrl: 'https://audio.url', audioDuration: 2, taskId: 't1', credits: 1}),
		);

		await client.speech(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/speech');
	});

	it('tts(params) → POST v1/tts returns raw Response', async () => {
		const params = {input: 'Hello', voice: 'spk_1'};
		const audioBytes = new Uint8Array([0, 1, 2, 3]);
		const rawResponse = new Response(audioBytes.buffer, {
			status: 200,
			headers: {'content-type': 'audio/mpeg'},
		});
		mockFetch.mockResolvedValueOnce(rawResponse);

		const result = await client.tts(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/tts');
		expect(result).toBeInstanceOf(Response);
	});

	it('audioSpeech(params) → POST v1/audio/speech returns raw Response', async () => {
		const params = {input: 'Hello', voice: 'spk_1'};
		const rawResponse = new Response(new Uint8Array([1, 2, 3]).buffer, {
			status: 200,
			headers: {'content-type': 'audio/mpeg'},
		});
		mockFetch.mockResolvedValueOnce(rawResponse);

		const result = await client.audioSpeech(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/audio/speech');
		expect(result).toBeInstanceOf(Response);
	});

	it('getFlowSpeechTextStream(id, event) → GET with searchParams returns raw Response', async () => {
		const rawResponse = new Response('data: chunk1\n\n', {
			status: 200,
			headers: {'content-type': 'text/event-stream'},
		});
		mockFetch.mockResolvedValueOnce(rawResponse);

		const result = await client.getFlowSpeechTextStream('ep_abc', 'script');

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('GET');
		expect(req.url).toContain('/v1/flow-speech/episodes/ep_abc/text-stream');
		expect(req.url).toContain('event=script');
		expect(result).toBeInstanceOf(Response);
	});

	it('createImage(params) → POST v1/images/generation', async () => {
		const params = {provider: 'openai', prompt: 'A cat'};
		mockFetch.mockResolvedValueOnce(rawJsonResponse({url: 'https://image.url'}));

		await client.createImage(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/images/generation');
	});

	it('createVideoGeneration(params) → POST v1/video-generation/generate', async () => {
		const params = {
			content: [
				{type: 'text' as const, text: 'A cat running'},
				{
					type: 'image_url' as const,
					image_url: {url: 'https://example.com/cat.jpg'},
					role: 'first_frame' as const,
				},
			],
			referenceImages: [{role: 'first_frame' as const, width: 1080, height: 1920, size: 3_600_000}],
		};
		let capturedBody: unknown;
		mockFetch.mockImplementationOnce(async (req: Request) => {
			capturedBody = await req.clone().json();
			return envelopeResponse({taskId: 'task_123', status: 'pending'});
		});

		await client.createVideoGeneration(params);

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('POST');
		expect(req.url).toContain('/v1/video-generation/generate');
		expect(capturedBody).toEqual(params);
	});

	it('getSubscription() → GET v1/user/subscription', async () => {
		mockFetch.mockResolvedValueOnce(envelopeResponse({totalAvailableCredits: 1000}));

		await client.getSubscription();

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('GET');
		expect(req.url).toContain('/v1/user/subscription');
	});
});

describe('OpenAPIClient – getMusicTask validation & encoding', () => {
	let client: OpenAPIClient;

	beforeEach(() => {
		client = new OpenAPIClient({
			apiKey: 'lh_sk_test',
			baseURL: 'https://api.test.com/openapi',
		});
	});

	it('throws without hitting the network when taskId is empty', async () => {
		await expect(client.getMusicTask('')).rejects.toThrow(/non-empty taskId/);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('GET v1/music/tasks/{id} and unwraps the envelope', async () => {
		mockFetch.mockResolvedValueOnce(envelopeResponse({taskId: 'abc', status: 'succeeded'}));

		const result = await client.getMusicTask('507f1f77bcf86cd799439011');

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.method).toBe('GET');
		expect(req.url).toContain('/v1/music/tasks/507f1f77bcf86cd799439011');
		expect(result).toEqual({taskId: 'abc', status: 'succeeded'});
	});

	it('encodeURIComponent-escapes the taskId in the path', async () => {
		mockFetch.mockResolvedValueOnce(envelopeResponse({taskId: 'x'}));

		await client.getMusicTask('foo bar/baz');

		const req: Request = mockFetch.mock.calls[0][0];
		expect(req.url).toContain('/v1/music/tasks/foo%20bar%2Fbaz');
	});
});

describe('OpenAPIClient – envelope unwrap compatibility', () => {
	let client: OpenAPIClient;

	beforeEach(() => {
		client = new OpenAPIClient({
			apiKey: 'lh_sk_test',
			baseURL: 'https://api.test.com/openapi',
		});
	});

	it('unwraps {code: 0, data: {...}} to return data directly', async () => {
		mockFetch.mockResolvedValueOnce(envelopeResponse({episodeId: 'abc'}));

		const result = await client.createFlowSpeech({
			sources: [{type: 'text', content: 'test'}],
			speakers: [{speakerId: 'spk_1'}],
		});

		expect(result).toEqual({episodeId: 'abc'});
	});

	it('throws ListenHubError when code != 0', async () => {
		mockFetch.mockResolvedValueOnce(errorEnvelopeResponse(40001, 'Invalid'));

		await expect(
			client.createFlowSpeech({
				sources: [{type: 'text', content: 'test'}],
				speakers: [{speakerId: 'spk_1'}],
			}),
		).rejects.toThrow(ListenHubError);

		try {
			mockFetch.mockResolvedValueOnce(errorEnvelopeResponse(40001, 'Invalid'));
			await client.createFlowSpeech({
				sources: [{type: 'text', content: 'test'}],
				speakers: [{speakerId: 'spk_1'}],
			});
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).code).toBe('40001');
			expect((e as ListenHubError).message).toBe('Invalid');
		}
	});

	it('passes through non-envelope JSON as-is (no code field)', async () => {
		const rawData = {created: 12345, data: [{url: 'https://img.url'}]};
		mockFetch.mockResolvedValueOnce(rawJsonResponse(rawData));

		const result = await client.createImage({provider: 'openai', prompt: 'A cat'});

		expect(result).toEqual(rawData);
	});
});

describe('OpenAPIClient – error normalization', () => {
	let client: OpenAPIClient;

	beforeEach(() => {
		client = new OpenAPIClient({
			apiKey: 'lh_sk_test',
			baseURL: 'https://api.test.com/openapi',
		});
	});

	it('throws ListenHubError with status 401 for unauthorized responses', async () => {
		mockFetch.mockResolvedValueOnce(
			httpErrorJsonResponse(401, {code: 40100, message: 'Unauthorized'}),
		);

		try {
			await client.getSubscription();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).status).toBe(401);
		}
	});

	it('throws ListenHubError with status 403 for forbidden responses', async () => {
		mockFetch.mockResolvedValueOnce(
			httpErrorJsonResponse(403, {code: 40300, message: 'Forbidden'}),
		);

		try {
			await client.getSubscription();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).status).toBe(403);
		}
	});

	it('throws ListenHubError after retries exhausted on 429', async () => {
		// 1 original + 2 retries (default maxRetries=2) = 3 total calls
		mockFetch
			.mockResolvedValueOnce(retryExhaustedResponse())
			.mockResolvedValueOnce(retryExhaustedResponse())
			.mockResolvedValueOnce(retryExhaustedResponse());

		await expect(client.getSubscription()).rejects.toThrow(ListenHubError);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it('throws ListenHubError with status 429 after all retries', async () => {
		mockFetch
			.mockResolvedValueOnce(retryExhaustedResponse())
			.mockResolvedValueOnce(retryExhaustedResponse())
			.mockResolvedValueOnce(retryExhaustedResponse());

		try {
			await client.getSubscription();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).status).toBe(429);
		}
	});

	it('throws ListenHubError for 500 with JSON body', async () => {
		mockFetch.mockResolvedValueOnce(httpErrorJsonResponse(500, {code: 50000, message: 'Internal'}));

		try {
			await client.getSubscription();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).status).toBe(500);
			expect((e as ListenHubError).message).toBe('Internal');
		}
	});

	it('throws ListenHubError with message from HTML title for 502', async () => {
		mockFetch.mockResolvedValueOnce(htmlErrorResponse(502, 'Bad Gateway'));

		try {
			await client.getSubscription();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).status).toBe(502);
			expect((e as ListenHubError).message).toBe('Bad Gateway');
		}
	});
});

describe('OpenAPIClient – isolation from ListenHubClient', () => {
	it('LISTENHUB_API_KEY env does not break ListenHubClient construction', async () => {
		vi.stubEnv('LISTENHUB_API_KEY', 'lh_sk_openapi_key');
		const {ListenHubClient} = await import('../../src/listenhub');
		// ListenHubClient has no apiKey requirement - should still construct
		expect(() => new ListenHubClient({baseURL: 'https://api.test.com/api'})).not.toThrow();
	});

	it('OpenAPIClient and ListenHubClient can coexist', async () => {
		vi.stubEnv('LISTENHUB_API_KEY', 'lh_sk_shared_env');
		const {ListenHubClient} = await import('../../src/listenhub');

		const openapi = new OpenAPIClient();
		const listenhub = new ListenHubClient({
			baseURL: 'https://api.test.com/api',
			accessToken: 'tok_123',
		});

		// Both exist without errors
		expect(openapi).toBeTruthy();
		expect(listenhub).toBeTruthy();

		// They send to different base URLs
		mockFetch.mockResolvedValueOnce(envelopeResponse({items: []}));
		await openapi.listSpeakers();
		const openapiReq: Request = mockFetch.mock.calls[0][0];
		expect(openapiReq.url).toContain('marswave.ai/openapi');

		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({code: 0, message: 'ok', data: {}}), {
				status: 200,
				headers: {'content-type': 'application/json'},
			}),
		);
		await listenhub.api.get('v1/me').json();
		const listenReq: Request = mockFetch.mock.calls[1][0];
		expect(listenReq.url).toContain('api.test.com/api');
	});
});
