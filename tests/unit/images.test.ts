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

describe('Image methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('deleteAIImages sends DELETE /v1/images with ids array', async () => {
		mockJsonResponse(null);
		await client.deleteAIImages({ids: ['img-1', 'img-2']});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/images');
		expect(req.method).toBe('DELETE');
		expect((req.body as any).ids).toEqual(['img-1', 'img-2']);
	});
});
