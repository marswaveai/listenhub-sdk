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

describe('ListenHub Voice methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createListenHubVoice sends POST /v1/listenhub-voice/generate with params', async () => {
		mockJsonResponse({taskId: 'sa-1', status: 'pending'});
		const result = await client.createListenHubVoice({
			text: '欢迎收听 ListenHub。',
			voices: [{type: 'speaker', id: 'zh_female_wanwanxiaohe_moon_bigtts'}],
			audioConfig: {format: 'mp3'},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/listenhub-voice/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).text).toBe('欢迎收听 ListenHub。');
		expect((req.body as any).voices).toHaveLength(1);
		expect((req.body as any).voices[0]).toEqual({
			type: 'speaker',
			id: 'zh_female_wanwanxiaohe_moon_bigtts',
		});
		expect((req.body as any).audioConfig.format).toBe('mp3');
		expect(result).toEqual({taskId: 'sa-1', status: 'pending'});
	});

	it('createListenHubVoice image variant sends image and no voices', async () => {
		mockJsonResponse({taskId: 'sa-2', status: 'pending'});
		const result = await client.createListenHubVoice({
			text: '为这张图配一段旁白。',
			image: {url: 'https://example.com/scene.jpg'},
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/listenhub-voice/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).image.url).toBe('https://example.com/scene.jpg');
		expect((req.body as any).voices).toBeUndefined();
		expect(result).toEqual({taskId: 'sa-2', status: 'pending'});
	});

	it('getListenHubVoiceTask sends GET /v1/listenhub-voice/tasks/:taskId', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				id: 'sa-1',
				status: 'success',
				model: 'listenhub-voice-1.0',
				params: {
					text: '欢迎收听 ListenHub。',
					image: {
						url: 'https://example.com/scene.jpg',
						thumbnailUrl: 'https://cdn.example.com/thumb.webp',
					},
				},
				audioUrl: 'https://cdn.example.com/audio.mp3',
				audioDuration: 12,
				creditCharged: 30,
				creditRefunded: 0,
				createdAt: 1700000000000,
				updatedAt: 1700000060000,
			}),
		);
		const result = await client.getListenHubVoiceTask('sa-1');
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.test.com/api/v1/listenhub-voice/tasks/sa-1');
		expect(result.id).toBe('sa-1');
		expect(result.status).toBe('success');
		expect(result.audioUrl).toBe('https://cdn.example.com/audio.mp3');
		expect(result.audioDuration).toBe(12);
		expect(result.creditCharged).toBe(30);
		expect(result.params.image?.thumbnailUrl).toBe('https://cdn.example.com/thumb.webp');
	});

	it('listListenHubVoiceTasks sends GET /v1/listenhub-voice/tasks with query params', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				items: [
					{
						id: 'sa-1',
						status: 'success',
						model: 'listenhub-voice-1.0',
						params: {text: '欢迎收听 ListenHub。'},
						audioUrl: 'https://cdn.example.com/audio.mp3',
						audioDuration: 12,
						creditCharged: 30,
						creditRefunded: 0,
						createdAt: 1700000000000,
						updatedAt: 1700000060000,
					},
				],
				page: 1,
				pageSize: 10,
				total: 1,
			}),
		);
		const result = await client.listListenHubVoiceTasks({
			page: 1,
			pageSize: 10,
			status: 'success',
			keyword: 'ListenHub',
		});
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toContain('v1/listenhub-voice/tasks');
		expect(req.url).toContain('page=1');
		expect(req.url).toContain('pageSize=10');
		expect(req.url).toContain('status=success');
		expect(req.url).toContain('keyword=ListenHub');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('sa-1');
		expect(result.total).toBe(1);
	});
});
