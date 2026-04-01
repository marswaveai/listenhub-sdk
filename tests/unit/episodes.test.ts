import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ListenHubClient} from '../../src/listenhub';

const mockFetch = vi.fn();

beforeEach(() => vi.stubGlobal('fetch', mockFetch));
afterEach(() => vi.restoreAllMocks());

function jsonResponse(data: unknown) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status: 200,
		headers: {'content-type': 'application/json'},
	});
}

async function capturedRequest(index = 0): Promise<{url: string; method: string; body: unknown}> {
	const req: Request = mockFetch.mock.calls[index][0];
	return {
		url: req.url,
		method: req.method,
		body: (req as any)._bodyForTest,
	};
}

function mockJsonResponse(data: unknown) {
	mockFetch.mockImplementationOnce(async (req: Request) => {
		const text = await req.text();
		(req as any)._bodyForTest = text ? JSON.parse(text) : undefined;
		return jsonResponse(data);
	});
}

describe('Episode methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createPodcast sends POST /v1/episodes/all-in-one with type/query/template', async () => {
		mockJsonResponse({episodeId: 'ep-1'});
		const result = await client.createPodcast({
			type: 'podcast-duo',
			query: 'AI trends 2025',
			template: {
				type: 'podcast',
				mode: 'deep',
				speakers: ['speaker-1', 'speaker-2'],
				language: 'en',
			},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/episodes/all-in-one');
		expect(req.method).toBe('POST');
		expect((req.body as any).type).toBe('podcast-duo');
		expect((req.body as any).query).toBe('AI trends 2025');
		expect((req.body as any).template).toMatchObject({type: 'podcast', mode: 'deep'});
		expect(result).toEqual({episodeId: 'ep-1'});
	});

	it('createTTS sends POST /v1/episodes/flow-speech and returns episodeId', async () => {
		mockJsonResponse({episodeId: 'ep-2'});
		const result = await client.createTTS({
			sources: [{type: 'text', content: 'Hello world'}],
			template: {
				type: 'flowspeech',
				mode: 'smart',
				speakers: ['speaker-1'],
				language: 'en',
			},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/episodes/flow-speech');
		expect(req.method).toBe('POST');
		expect(result).toEqual({episodeId: 'ep-2'});
	});

	it('createExplainerVideo sends POST /v1/episodes/storybook with mode: info', async () => {
		mockJsonResponse({episodeId: 'ep-3'});
		const result = await client.createExplainerVideo({
			query: 'How does AI work',
			imageConfig: {size: '2K', aspectRatio: '16:9'},
			template: {
				type: 'storybook',
				mode: 'info',
				speakers: ['speaker-1'],
				language: 'en',
				size: '2K',
				aspectRatio: '16:9',
			},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/episodes/storybook');
		expect(req.method).toBe('POST');
		expect((req.body as any).template.mode).toBe('info');
		expect(result).toEqual({episodeId: 'ep-3'});
	});

	it('createSlides sends POST /v1/episodes/storybook with mode: slides', async () => {
		mockJsonResponse({episodeId: 'ep-4'});
		const result = await client.createSlides({
			query: 'Intro to TypeScript',
			imageConfig: {size: '4K', aspectRatio: '16:9'},
			template: {
				type: 'storybook',
				mode: 'slides',
				speakers: ['speaker-1'],
				language: 'en',
				size: '4K',
				aspectRatio: '16:9',
			},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/episodes/storybook');
		expect(req.method).toBe('POST');
		expect((req.body as any).template.mode).toBe('slides');
		expect(result).toEqual({episodeId: 'ep-4'});
	});

	it('listPodcasts sends GET /v1/episodes with productId=aiPodcast', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				items: [{id: 'ep-1', title: 'Episode 1'}],
				pagination: {page: 1, pageSize: 10, total: 1},
			}),
		);
		const result = await client.listPodcasts({page: 1, pageSize: 10});
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toContain('v1/episodes');
		expect(req.url).toContain('page=1');
		expect(req.url).toContain('pageSize=10');
		expect(req.url).toContain('productId=aiPodcast');
		expect(result.items).toHaveLength(1);
		expect(result.pagination.page).toBe(1);
	});

	it('getCreation sends GET /v5/episodes/{id}/detail and returns episode detail', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				id: 'ep-1',
				generationType: 'podcast',
				generationMode: 'deep',
				processStatus: 'completed',
			}),
		);
		const result = await client.getCreation('ep-1');
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.test.com/api/v5/episodes/ep-1/detail');
		expect(result.id).toBe('ep-1');
	});

	it('deleteCreations sends DELETE /v1/episodes with ids array', async () => {
		mockJsonResponse(null);
		await client.deleteCreations({ids: ['ep-1', 'ep-2']});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/episodes');
		expect(req.method).toBe('DELETE');
		expect((req.body as any).ids).toEqual(['ep-1', 'ep-2']);
	});
});
