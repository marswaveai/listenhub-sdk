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

function rawRequest(input: unknown, init?: RequestInit): Request {
	return input instanceof Request ? input : new Request(input as string, init);
}

describe('Video Generation methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	function pngBytes(width: number, height: number) {
		return new Uint8Array([
			0x89,
			0x50,
			0x4e,
			0x47,
			0x0d,
			0x0a,
			0x1a,
			0x0a,
			0x00,
			0x00,
			0x00,
			0x0d,
			0x49,
			0x48,
			0x44,
			0x52,
			(width >>> 24) & 0xff,
			(width >>> 16) & 0xff,
			(width >>> 8) & 0xff,
			width & 0xff,
			(height >>> 24) & 0xff,
			(height >>> 16) & 0xff,
			(height >>> 8) & 0xff,
			height & 0xff,
		]);
	}

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
			referenceImages: [{role: 'first_frame', width: 1080, height: 1920, size: 3_600_000}],
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
		expect((req.body as any).referenceImages).toEqual([
			{role: 'first_frame', width: 1080, height: 1920, size: 3_600_000},
		]);
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
				items: [
					{
						id: 'vt-1',
						status: 'success',
						model: 'SeeDance 2.0 Fast',
						params: {resolution: '720p', ratio: '16:9', duration: 5},
						seed: 99,
						creditCharged: 18,
						createdAt: 1700000000000,
					},
				],
				page: 1,
				pageSize: 10,
				total: 1,
			}),
		);
		const result = await client.listVideoGenerationTasks({
			page: 1,
			pageSize: 10,
			status: 'success',
		});
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
			referenceVideos: [
				{role: 'reference_video', width: 1280, height: 720, duration: 5, fps: 30, size: 8_000_000},
			],
			ratio: '16:9',
		});
		const req = await capturedRequest();
		expect((req.body as any).hasVideoInput).toBe(true);
		expect((req.body as any).inputVideoDuration).toBe(5);
		expect((req.body as any).referenceVideos).toEqual([
			{role: 'reference_video', width: 1280, height: 720, duration: 5, fps: 30, size: 8_000_000},
		]);
		expect((req.body as any).ratio).toBe('16:9');
		expect(result).toEqual({tokens: 3320, credits: 10});
	});

	it('uploadFile creates a presigned URL and uploads the file body', async () => {
		mockFetch
			.mockImplementationOnce(async (req: Request) => {
				const body = await req.clone().json();
				expect(req.method).toBe('POST');
				expect(req.url).toBe('https://api.test.com/api/v1/files');
				expect(body).toEqual({
					fileKey: 'frame.png',
					contentType: 'image/png',
					category: 'episode',
				});
				return jsonResponse({
					presignedUrl: 'https://upload.example.com/frame.png',
					fileUrl: 'https://storage.googleapis.com/private-bucket/uploads/frame.png',
				});
			})
			.mockImplementationOnce(async (input: unknown, init?: RequestInit) => {
				const req = rawRequest(input, init);
				expect(req.method).toBe('PUT');
				expect(req.url).toBe('https://upload.example.com/frame.png');
				expect(req.headers.get('content-type')).toBe('image/png');
				expect((await req.arrayBuffer()).byteLength).toBe(3);
				return new Response(null, {status: 200, statusText: 'OK'});
			});

		const result = await client.uploadFile({
			file: new Blob([new Uint8Array([1, 2, 3])], {type: 'image/png'}),
			fileName: 'frame.png',
		});

		expect(result.fileUrl).toBe('https://storage.googleapis.com/private-bucket/uploads/frame.png');
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it('uploadVideoReferenceImage uploads a local image and returns Seedance metadata', async () => {
		mockFetch
			.mockImplementationOnce(async () =>
				jsonResponse({
					presignedUrl: 'https://upload.example.com/frame.png',
					fileUrl: 'https://storage.googleapis.com/private-bucket/uploads/frame.png',
				}),
			)
			.mockImplementationOnce(async () => new Response(null, {status: 200, statusText: 'OK'}));

		const result = await client.uploadVideoReferenceImage({
			file: new Blob([pngBytes(1080, 1920)], {type: 'image/png'}),
			fileName: 'frame.png',
			role: 'first_frame',
		});

		expect(result.content).toEqual({
			type: 'image_url',
			image_url: {url: 'https://storage.googleapis.com/private-bucket/uploads/frame.png'},
			role: 'first_frame',
		});
		expect(result.referenceImage).toEqual({
			role: 'first_frame',
			width: 1080,
			height: 1920,
			size: 24,
		});
	});

	it('createVideoGeneration with happyhorse model sends correct params', async () => {
		mockJsonResponse({taskId: 'vt-hh-1', status: 'generating'});
		const result = await client.createVideoGeneration({
			model: 'happyhorse',
			content: [{type: 'text', text: '一只猫在月球上跳舞'}],
			resolution: '720p',
			ratio: '4:5',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).model).toBe('happyhorse');
		expect((req.body as any).ratio).toBe('4:5');
		expect(result).toEqual({taskId: 'vt-hh-1', status: 'generating'});
	});

	it('createVideoGeneration with happyhorse video-edit sends audioSetting', async () => {
		mockJsonResponse({taskId: 'vt-hh-2', status: 'generating'});
		const result = await client.createVideoGeneration({
			model: 'happyhorse',
			content: [
				{type: 'text', text: '将背景替换为星空'},
				{
					type: 'video_url',
					video_url: {url: 'https://example.com/video.mp4'},
					role: 'reference_video',
				},
			],
			resolution: '720p',
			ratio: '16:9',
			duration: 5,
			inputVideoDuration: 10,
			audioSetting: 'origin',
		});
		const req = await capturedRequest();
		expect((req.body as any).model).toBe('happyhorse');
		expect((req.body as any).audioSetting).toBe('origin');
		expect((req.body as any).inputVideoDuration).toBe(10);
		expect((req.body as any).content[1].type).toBe('video_url');
		expect(result).toEqual({taskId: 'vt-hh-2', status: 'generating'});
	});

	it('estimateVideoGenerationCredits with happyhorse model', async () => {
		mockJsonResponse({tokens: 5000, credits: 15});
		const result = await client.estimateVideoGenerationCredits({
			model: 'happyhorse',
			resolution: '720p',
			duration: 5,
			ratio: '4:5',
		});
		const req = await capturedRequest();
		expect((req.body as any).model).toBe('happyhorse');
		expect((req.body as any).ratio).toBe('4:5');
		expect(result).toEqual({tokens: 5000, credits: 15});
	});

	it('createPixVerseVideoGeneration sends POST /v1/video-generation/pixverse/generate', async () => {
		mockJsonResponse({taskId: 'pv-1', episodeId: 'ep-1', status: 'generating'});
		const result = await client.createPixVerseVideoGeneration({
			capability: 'text_to_video',
			prompt: '一只猫在花园里奔跑',
			quality: '720p',
			aspectRatio: '16:9',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/pixverse/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).capability).toBe('text_to_video');
		expect((req.body as any).prompt).toBe('一只猫在花园里奔跑');
		expect((req.body as any).quality).toBe('720p');
		expect((req.body as any).aspectRatio).toBe('16:9');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({taskId: 'pv-1', episodeId: 'ep-1', status: 'generating'});
	});

	it('createPixVerseVideoGeneration forwards nested pixverse agent options', async () => {
		mockJsonResponse({taskId: 'pv-2', status: 'generating'});
		const result = await client.createPixVerseVideoGeneration({
			capability: 'agent',
			model: 'v6',
			language: 'zh',
			prompt: '为这款产品制作一支广告',
			images: [
				{url: 'https://example.com/p1.jpg'},
				{url: 'https://example.com/p2.jpg'},
				{url: 'https://example.com/p3.jpg'},
				{url: 'https://example.com/p4.jpg'},
			],
			quality: '1080p',
			duration: 30,
			pixverse: {agentType: 'promo_mix'},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/pixverse/generate');
		expect((req.body as any).capability).toBe('agent');
		expect((req.body as any).model).toBe('v6');
		expect((req.body as any).language).toBe('zh');
		expect((req.body as any).images).toHaveLength(4);
		expect((req.body as any).pixverse.agentType).toBe('promo_mix');
		expect(result).toEqual({taskId: 'pv-2', status: 'generating'});
	});

	it('estimatePixVerseVideoCredits sends POST /v1/video-generation/pixverse/estimate-credits', async () => {
		mockJsonResponse({tokens: 2000, credits: 7});
		const result = await client.estimatePixVerseVideoCredits({
			capability: 'text_to_video',
			quality: '720p',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/pixverse/estimate-credits');
		expect(req.method).toBe('POST');
		expect((req.body as any).capability).toBe('text_to_video');
		expect((req.body as any).quality).toBe('720p');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({tokens: 2000, credits: 7});
	});
});
