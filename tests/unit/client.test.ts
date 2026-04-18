import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ListenHubClient} from '../../src/listenhub';
import {ListenHubError} from '../../src/errors';

const mockFetch = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

function errorResponse(code: number, message: string, status = 200) {
	return new Response(JSON.stringify({code, message}), {
		status,
		headers: {'content-type': 'application/json'},
	});
}

describe('ListenHubClient', () => {
	describe('api.get / api.post', () => {
		it('sends GET request and unwraps data from response', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(jsonResponse({items: [1, 2, 3]}));

			const result = await client.api.get('v1/things').json<{items: number[]}>();

			expect(mockFetch).toHaveBeenCalledOnce();
			const req: Request = mockFetch.mock.calls[0][0];
			expect(req.url).toContain('/api/v1/things');
			expect(req.method).toBe('GET');
			expect(result).toEqual({items: [1, 2, 3]});
		});

		it('sends POST request with JSON body', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(jsonResponse({id: 'abc'}));

			await client.api.post('v1/things', {json: {name: 'test'}}).json();

			const req: Request = mockFetch.mock.calls[0][0];
			expect(req.method).toBe('POST');
		});

		it('injects Authorization header when accessToken is a string', async () => {
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				accessToken: 'tok_123',
			});
			mockFetch.mockResolvedValueOnce(jsonResponse({}));

			await client.api.get('v1/me').json();

			const req: Request = mockFetch.mock.calls[0][0];
			expect(req.headers.get('authorization')).toBe('Bearer tok_123');
		});

		it('injects Authorization header when accessToken is a getter', async () => {
			const token = {value: 'tok_getter'};
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				accessToken: () => token.value,
			});
			mockFetch.mockResolvedValueOnce(jsonResponse({}));

			await client.api.get('v1/me').json();

			const req: Request = mockFetch.mock.calls[0][0];
			expect(req.headers.get('authorization')).toBe('Bearer tok_getter');
		});

		it('handles 204 No Content without error', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(new Response(null, {status: 204}));

			await client.api.delete('v1/things/1');
		});
	});

	describe('no nested resources', () => {
		it('does not have auth, checkin, or settings sub-objects', () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			expect((client as any).auth).toBeUndefined();
			expect((client as any).checkin).toBeUndefined();
			expect((client as any).settings).toBeUndefined();
		});
	});

	describe('camelCase / snake_case conversion', () => {
		it('sends request body keys as-is (no conversion)', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			let capturedBody: unknown;
			mockFetch.mockImplementationOnce(async (req: Request) => {
				capturedBody = await req.clone().json();
				return jsonResponse({});
			});

			await client.api
				.post('v1/auth/token', {
					json: {grantType: 'refresh_token', refreshToken: 'rt_123'},
				})
				.json();

			expect(capturedBody).toEqual({
				grantType: 'refresh_token',
				refreshToken: 'rt_123',
			});
		});

		it('returns response data as-is', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						code: 0,
						message: 'ok',
						data: {accessToken: 'at', refreshToken: 'rt', expiresIn: 3600},
					}),
					{status: 200, headers: {'content-type': 'application/json'}},
				),
			);

			const result = await client.api.post('v1/auth/token').json();

			expect(result).toEqual({
				accessToken: 'at',
				refreshToken: 'rt',
				expiresIn: 3600,
			});
		});
	});

	describe('content-type error parsing', () => {
		it('parses JSON error responses', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(errorResponse(21002, 'Auth state not found'));

			try {
				await client.api.post('v1/auth/connect/token', {json: {}}).json();
				expect.fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(ListenHubError);
				expect((e as ListenHubError).code).toBe('21002');
				expect((e as ListenHubError).message).toBe('Auth state not found');
			}
		});

		it('parses HTML error responses (gateway errors)', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(
				new Response('<html><head><title>502 Bad Gateway</title></head><body></body></html>', {
					status: 502,
					headers: {'content-type': 'text/html'},
				}),
			);

			try {
				await client.api.get('v1/things').json();
				expect.fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(ListenHubError);
				expect((e as ListenHubError).status).toBe(502);
				expect((e as ListenHubError).code).toBe('GATEWAY_ERROR');
				expect((e as ListenHubError).message).toBe('502 Bad Gateway');
			}
		});

		it('handles unknown content-type errors', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});
			mockFetch.mockResolvedValueOnce(
				new Response('Bad Gateway', {
					status: 502,
					headers: {'content-type': 'text/plain'},
				}),
			);

			try {
				await client.api.get('v1/things').json();
				expect.fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(ListenHubError);
				expect((e as ListenHubError).status).toBe(502);
				expect((e as ListenHubError).code).toBe('UNKNOWN_ERROR');
			}
		});
	});

	describe('401 error handling', () => {
		it('throws ListenHubError with status 401 on unauthorized requests', async () => {
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				accessToken: 'tok',
			});

			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify({code: 20001, message: 'Token expired'}), {
					status: 401,
					headers: {'content-type': 'application/json'},
				}),
			);

			try {
				await client.api.get('v1/me').json();
				expect.fail('Should have thrown');
			} catch (e) {
				expect(e).toBeInstanceOf(ListenHubError);
				expect((e as ListenHubError).status).toBe(401);
			}
		});
	});

	describe('429 rate limit retry', () => {
		it('retries on 429 with Retry-After header (seconds)', async () => {
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				maxRetries: 2,
			});

			mockFetch
				.mockResolvedValueOnce(
					new Response('', {
						status: 429,
						headers: {'retry-after': '0'},
					}),
				)
				.mockResolvedValueOnce(jsonResponse({ok: true}));

			const result = await client.api.get('v1/things').json();

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ok: true});
		});

		it('retries up to maxRetries times then throws', async () => {
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				maxRetries: 2,
			});

			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({code: 42900, message: 'Too many requests'}), {
					status: 429,
					headers: {'retry-after': '0', 'content-type': 'application/json'},
				}),
			);

			await expect(client.api.get('v1/things').json()).rejects.toThrow(ListenHubError);
			// 1 initial + 2 retries = 3 calls
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it('does not retry when maxRetries is 0', async () => {
			const client = new ListenHubClient({
				baseURL: 'https://api.test.com/api',
				maxRetries: 0,
			});

			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({code: 42900, message: 'Too many requests'}), {
					status: 429,
					headers: {'content-type': 'application/json'},
				}),
			);

			await expect(client.api.get('v1/things').json()).rejects.toThrow(ListenHubError);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});
});

describe('ListenHubClient (from index)', () => {
	it('exports flat methods instead of nested resources', async () => {
		const {ListenHubClient} = await import('../../src/index');
		const client = new ListenHubClient();
		expect(typeof client.refresh).toBe('function');
		expect(typeof client.connectInit).toBe('function');
		expect(typeof client.connectToken).toBe('function');
		expect(typeof client.revoke).toBe('function');
		expect(typeof client.checkinSubmit).toBe('function');
		expect(typeof client.checkinStatus).toBe('function');
		expect(typeof client.getApiKey).toBe('function');
		expect(typeof client.regenerateApiKey).toBe('function');
	});
});
