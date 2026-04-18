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

describe('Auth methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('connectInit sends POST /v1/auth/connect/init with callbackPort', async () => {
		mockJsonResponse({
			sessionId: 'sess-1',
			authUrl: 'https://auth.test/cli?session_id=sess-1',
		});
		const result = await client.connectInit({callbackPort: 19526});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/auth/connect/init');
		expect(req.method).toBe('POST');
		expect(req.body).toEqual({callbackPort: 19526});
		expect(result).toEqual({
			sessionId: 'sess-1',
			authUrl: 'https://auth.test/cli?session_id=sess-1',
		});
	});

	it('connectToken sends POST /v1/auth/connect/token', async () => {
		mockJsonResponse({accessToken: 'at', refreshToken: 'rt', expiresIn: 2592000});
		const result = await client.connectToken({
			sessionId: 'sess-1',
			code: 'code-1',
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/auth/connect/token');
		expect(req.body).toEqual({sessionId: 'sess-1', code: 'code-1'});
		expect(result.accessToken).toBe('at');
	});

	it('refresh sends POST /v1/auth/token with grantType', async () => {
		mockJsonResponse({
			accessToken: 'new-at',
			refreshToken: 'new-rt',
			expiresIn: 2592000,
		});
		const result = await client.refresh({refreshToken: 'old-rt'});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/auth/token');
		expect(req.body).toEqual({
			grantType: 'refresh_token',
			refreshToken: 'old-rt',
		});
		expect(result.accessToken).toBe('new-at');
	});

	it('revoke sends POST /v1/auth/token/revoke', async () => {
		mockJsonResponse({success: true});
		await client.revoke({refreshToken: 'rt-to-revoke'});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/auth/token/revoke');
		expect(req.body).toEqual({refreshToken: 'rt-to-revoke'});
	});
});
