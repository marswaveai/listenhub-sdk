import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import type {Server} from 'node:http';
import getPort from 'get-port';
import {ListenHubClient} from '../../src/listenhub';
import {ListenHubError} from '../../src/errors';
import {createMockServer} from '../fixtures/server';

let server: Server;
let baseURL: string;

beforeAll(async () => {
	const port = await getPort();
	const app = createMockServer();
	server = app.listen(port);
	baseURL = `http://127.0.0.1:${port}/api`;
});

afterAll(() => {
	server?.close();
});

describe('Integration: ListenHubClient', () => {
	it('GET request with camelCase response', async () => {
		const client = new ListenHubClient({baseURL});
		const result = await client.api.get('v1/things').json<{itemCount: number; items: number[]}>();
		expect(result.itemCount).toBe(3);
		expect(result.items).toEqual([1, 2, 3]);
	});

	it('POST request sends body keys as-is', async () => {
		const client = new ListenHubClient({baseURL});
		const result = await client.api
			.post('v1/echo', {json: {userName: 'alice', accountType: 'pro'}})
			.json<Record<string, unknown>>();
		// Server echoes body back, client camelizes response (no-op since already camelCase)
		expect(result).toEqual({userName: 'alice', accountType: 'pro'});
	});

	it('204 No Content succeeds without body', async () => {
		const client = new ListenHubClient({baseURL});
		const response = await client.api.delete('v1/things/1');
		expect(response.status).toBe(204);
	});

	it('JSON API error', async () => {
		const client = new ListenHubClient({baseURL});
		try {
			await client.api.get('v1/error').json();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).code).toBe('40001');
			expect((e as ListenHubError).requestId).toBe('req_123');
		}
	});

	it('HTML gateway error', async () => {
		const client = new ListenHubClient({baseURL});
		try {
			await client.api.get('v1/gateway-error').json();
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ListenHubError);
			expect((e as ListenHubError).code).toBe('GATEWAY_ERROR');
			expect((e as ListenHubError).message).toBe('502 Bad Gateway');
		}
	});

	it('429 retries and succeeds', async () => {
		const client = new ListenHubClient({baseURL});
		const result = await client.api.get('v1/rate-limited').json<{ok: boolean}>();
		expect(result).toEqual({ok: true});
	});
});
