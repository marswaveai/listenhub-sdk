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

describe('Video Generation methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createVideoGeneration sends POST /v1/video-generation/generate with params', async () => {
		mockJsonResponse({taskId: 'vt-1', status: 'generating'});
		const result = await client.createVideoGeneration({
			model: 'doubao-seedance-2-fast',
			content: [
				{type: 'text', text: '一只猫在花园里奔跑'},
				{type: 'image_url', image_url: {url: 'https://example.com/cat.jpg'}, role: 'first_frame'},
			],
			resolution: '720p',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).model).toBe('doubao-seedance-2-fast');
		expect((req.body as any).content).toHaveLength(2);
		expect((req.body as any).content[0].type).toBe('text');
		expect((req.body as any).content[1].role).toBe('first_frame');
		expect((req.body as any).resolution).toBe('720p');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({taskId: 'vt-1', status: 'generating'});
	});

	it('getVideoGenerationTask sends GET /v1/video-generation/tasks/:taskId', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				id: 'vt-1',
				status: 'success',
				model: 'SeeDance 2.0 Fast',
				params: {
					content: [{type: 'text', text: 'test'}],
					resolution: '720p',
					ratio: '16:9',
					duration: 5,
					generateAudio: true,
					seed: 42,
				},
				videoUrl: 'https://cdn.example.com/video.mp4',
				seed: 12345,
				creditCharged: 18,
				createdAt: 1700000000000,
				updatedAt: 1700000060000,
			}),
		);
		const result = await client.getVideoGenerationTask('vt-1');
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/tasks/vt-1');
		expect(result.id).toBe('vt-1');
		expect(result.status).toBe('success');
		expect(result.videoUrl).toBe('https://cdn.example.com/video.mp4');
		expect(result.seed).toBe(12345);
		expect(result.params.content).toHaveLength(1);
	});

	it('listVideoGenerationTasks sends GET /v1/video-generation/tasks with query params', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				items: [{id: 'vt-1', status: 'success', model: 'SeeDance 2.0 Fast', params: {resolution: '720p', ratio: '16:9', duration: 5}, seed: 99, creditCharged: 18, createdAt: 1700000000000}],
				page: 1,
				pageSize: 10,
				total: 1,
			}),
		);
		const result = await client.listVideoGenerationTasks({page: 1, pageSize: 10, status: 'success'});
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toContain('v1/video-generation/tasks');
		expect(req.url).toContain('page=1');
		expect(req.url).toContain('pageSize=10');
		expect(req.url).toContain('status=success');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].seed).toBe(99);
		expect(result.total).toBe(1);
	});

	it('estimateVideoGenerationCredits sends POST /v1/video-generation/estimate-credits', async () => {
		mockJsonResponse({tokens: 6000, credits: 18});
		const result = await client.estimateVideoGenerationCredits({
			model: 'doubao-seedance-2-fast',
			resolution: '720p',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/estimate-credits');
		expect(req.method).toBe('POST');
		expect((req.body as any).model).toBe('doubao-seedance-2-fast');
		expect((req.body as any).resolution).toBe('720p');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({tokens: 6000, credits: 18});
	});

	it('estimateVideoGenerationCredits with video input includes hasVideoInput and inputVideoDuration', async () => {
		mockJsonResponse({tokens: 3320, credits: 10});
		const result = await client.estimateVideoGenerationCredits({
			model: 'doubao-seedance-2-pro',
			resolution: '480p',
			duration: 5,
			hasVideoInput: true,
			inputVideoDuration: 5,
			ratio: '16:9',
		});
		const req = await capturedRequest();
		expect((req.body as any).hasVideoInput).toBe(true);
		expect((req.body as any).inputVideoDuration).toBe(5);
		expect((req.body as any).ratio).toBe('16:9');
		expect(result).toEqual({tokens: 3320, credits: 10});
	});
});
