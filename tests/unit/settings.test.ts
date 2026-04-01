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

describe('Settings methods', () => {
	it('getApiKey sends GET /v1/settings/api-key and returns key', async () => {
		const client = new ListenHubClient({
			baseURL: 'https://api.test.com/api',
			accessToken: 'test-token',
		});
		mockFetch.mockResolvedValueOnce(jsonResponse({key: 'lh_sk_abc_secret123'}));

		const result = await client.getApiKey();

		expect(result.key).toBe('lh_sk_abc_secret123');
		const request = mockFetch.mock.calls[0][0] as Request;
		expect(request.url).toBe('https://api.test.com/api/v1/settings/api-key');
		expect(request.method).toBe('GET');
	});

	it('regenerateApiKey sends POST /v1/settings/api-key/regenerate and returns new key', async () => {
		const client = new ListenHubClient({
			baseURL: 'https://api.test.com/api',
			accessToken: 'test-token',
		});
		mockFetch.mockResolvedValueOnce(jsonResponse({key: 'lh_sk_def_newsecret456'}));

		const result = await client.regenerateApiKey();

		expect(result.key).toBe('lh_sk_def_newsecret456');
		const request = mockFetch.mock.calls[0][0] as Request;
		expect(request.url).toBe('https://api.test.com/api/v1/settings/api-key/regenerate');
		expect(request.method).toBe('POST');
	});

	it('getSettings sends GET /v2/settings and returns items', async () => {
		const client = new ListenHubClient({
			baseURL: 'https://api.test.com/api',
			accessToken: 'test-token',
		});
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				items: [
					{
						type: 'podcast',
						language: 'en',
						speakers: [],
						duration: 'medium',
						mode: 'deep',
						updatedAt: 1700000000,
						imagesConfig: {},
					},
				],
			}),
		);
		const result = await client.getSettings();
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.url).toBe('https://api.test.com/api/v2/settings');
		expect(req.method).toBe('GET');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].type).toBe('podcast');
	});
});
