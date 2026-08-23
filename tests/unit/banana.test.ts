import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ListenHubClient} from '../../src/listenhub';
import {
	ACCEPTED_IMAGE_MODELS,
	IMAGE_MODELS,
	LEGACY_IMAGE_MODEL_ALIASES,
} from '../../src/types/images';

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

describe('Banana image methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createBananaImage posts /v1/banana/images, not /v1/images', async () => {
		mockJsonResponse({imageId: 'banana-1'});
		const result = await client.createBananaImage({prompt: 'a cat'});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/banana/images');
		expect(req.method).toBe('POST');
		expect(result.imageId).toBe('banana-1');
	});

	it('createBananaImage passes the banana-only params through untouched', async () => {
		mockJsonResponse({imageId: 'banana-2'});
		await client.createBananaImage({
			prompt: 'a dog',
			batchId: 'batch-uuid',
			isPublic: true,
			quality: 'high',
			model: 'seedream-5-0-pro',
			rootImageId: '68c9f2a1b3d4e5f6a7b8c9d0',
			editRootImageId: '68c9f2a1b3d4e5f6a7b8c9d1',
			editParentImageId: '68c9f2a1b3d4e5f6a7b8c9d2',
			referenceImageUrls: ['https://example.test/a.png'],
		});
		const req = await capturedRequest();
		expect(req.body).toMatchObject({
			batchId: 'batch-uuid',
			isPublic: true,
			quality: 'high',
			model: 'seedream-5-0-pro',
			rootImageId: '68c9f2a1b3d4e5f6a7b8c9d0',
			editRootImageId: '68c9f2a1b3d4e5f6a7b8c9d1',
			editParentImageId: '68c9f2a1b3d4e5f6a7b8c9d2',
		});
	});

	it('n 张同批：调用方给同一个 batchId，SDK 逐个发出且不改写它', async () => {
		mockJsonResponse({imageId: 'a'});
		mockJsonResponse({imageId: 'b'});
		const batchId = 'shared-batch';
		await Promise.all([
			client.createBananaImage({prompt: 'p', batchId}),
			client.createBananaImage({prompt: 'p', batchId}),
		]);
		const first = await capturedRequest(0);
		const second = await capturedRequest(1);
		expect((first.body as any).batchId).toBe(batchId);
		expect((second.body as any).batchId).toBe(batchId);
	});

	it('getBananaImage hits /v1/banana/images/:id', async () => {
		mockJsonResponse({id: 'banana-1', prompt: 'a cat'});
		await client.getBananaImage('banana-1');
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/banana/images/banana-1');
		expect(req.method).toBe('GET');
	});

	it('listBananaImages forwards scope and paging as query params', async () => {
		mockJsonResponse({items: [], pagination: {page: 1, pageSize: 10, total: 0}});
		await client.listBananaImages({page: 2, pageSize: 30, scope: 'me'});
		const req = await capturedRequest();
		expect(req.url).toContain('/v1/banana/images?');
		expect(req.url).toContain('page=2');
		expect(req.url).toContain('pageSize=30');
		expect(req.url).toContain('scope=me');
	});
});

describe('Banana video methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createBananaVideoGeneration hits the /banana-prefixed route', async () => {
		mockJsonResponse({taskId: 'task-1'});
		await client.createBananaVideoGeneration({
			content: [{type: 'text', text: 'a cat', role: 'first_frame'}],
		} as any);
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/banana/video-generation/generate');
		expect(req.method).toBe('POST');
	});

	it('get/list/estimate all stay under /v1/banana/video-generation', async () => {
		mockJsonResponse({taskId: 'task-1'});
		await client.getBananaVideoGenerationTask('task-1');
		expect((await capturedRequest(0)).url).toBe(
			'https://api.test.com/api/v1/banana/video-generation/tasks/task-1',
		);

		mockJsonResponse({items: [], total: 0, page: 1, pageSize: 10});
		await client.listBananaVideoGenerationTasks({page: 1});
		expect((await capturedRequest(1)).url).toContain('/v1/banana/video-generation/tasks?');

		mockJsonResponse({credits: 10});
		await client.estimateBananaVideoGenerationCredits({} as any);
		expect((await capturedRequest(2)).url).toBe(
			'https://api.test.com/api/v1/banana/video-generation/estimate-credits',
		);
	});
});

describe('ImageModel 与后端 ACCEPTED_IMAGE_MODEL_INPUTS 对齐', () => {
	// 后端 src/common/constants.ts 的 ImageModel 枚举 + LEGACY_IMAGE_MODEL_ALIASES 键。
	// 后端加模型而这里没跟上时，SDK 会调不到已上线的模型——这条断言就是防漂移的闸。
	const backendAccepted = [
		'gemini-3-pro-image',
		'gemini-3.1-flash-image',
		'gpt-image-2',
		'gpt-image-2-official',
		'wan2.7-image-pro',
		'wan2.7-image',
		'seedream-5-0-pro',
		'gemini-3-pro-image-preview',
		'gemini-3.1-flash-image-preview',
	];

	it('GA 值 7 个、legacy 别名 2 个，与后端逐项相等', () => {
		expect(IMAGE_MODELS).toHaveLength(7);
		expect(LEGACY_IMAGE_MODEL_ALIASES).toHaveLength(2);
		expect([...ACCEPTED_IMAGE_MODELS].sort()).toEqual([...backendAccepted].sort());
	});
});
