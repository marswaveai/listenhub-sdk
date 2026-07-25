import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {ListenHubClient} from '../../src/listenhub';
import {OpenAPIClient} from '../../src/openapi-client';
import {resetDomainSelectionCache} from '../../src/domain-selection';

const mockFetch = vi.fn();

const DEFAULT_HOST = 'api.listenhub.ai';
const OPENAPI_DEFAULT_HOST = 'api.marswave.ai';
const FALLBACK_HOST = 'api.listenhub.app';

let configHome: string;

function storePath(): string {
	return path.join(configHome, 'listenhub', 'domain.json');
}

function writeStore(discovered: Record<string, string>): void {
	fs.mkdirSync(path.join(configHome, 'listenhub'), {recursive: true});
	fs.writeFileSync(storePath(), JSON.stringify({discovered}));
}

function readStore(): {discovered?: Record<string, string>} {
	return JSON.parse(fs.readFileSync(storePath(), 'utf8')) as {
		discovered?: Record<string, string>;
	};
}

function jsonResponse(data: unknown) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status: 200,
		headers: {'content-type': 'application/json'},
	});
}

/** Node fetch 的连接层失败长这样：拿不到任何 HTTP 响应。 */
function connectionFailure() {
	return new TypeError('fetch failed');
}

function requestedHosts(): string[] {
	return mockFetch.mock.calls.map((call) => {
		const input: unknown = call[0];
		return new URL(input instanceof Request ? input.url : String(input)).host;
	});
}

beforeEach(() => {
	configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-domain-'));
	process.env['XDG_CONFIG_HOME'] = configHome;
	delete process.env['LISTENHUB_API_URL'];
	delete process.env['LISTENHUB_OPENAPI_URL'];
	delete process.env['LISTENHUB_DOMAIN'];
	resetDomainSelectionCache();
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.restoreAllMocks();
	mockFetch.mockReset();
	fs.rmSync(configHome, {recursive: true, force: true});
	delete process.env['XDG_CONFIG_HOME'];
	delete process.env['LISTENHUB_DOMAIN'];
});

describe('domain selection', () => {
	describe('idempotent requests', () => {
		it('falls back to the alternate domain when the default host is unreachable', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch
				.mockRejectedValueOnce(connectionFailure())
				.mockResolvedValueOnce(jsonResponse({items: []}));

			const result = await client.listSpeakers();

			expect(result).toEqual({items: []});
			expect(requestedHosts()).toEqual([DEFAULT_HOST, FALLBACK_HOST]);
		});

		it('persists the successful fallback so later clients skip the dead domain', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch
				.mockRejectedValueOnce(connectionFailure())
				.mockResolvedValueOnce(jsonResponse({items: []}));
			await client.listSpeakers();

			expect(readStore().discovered).toEqual({[DEFAULT_HOST]: FALLBACK_HOST});

			mockFetch.mockReset();
			resetDomainSelectionCache();
			mockFetch.mockResolvedValueOnce(jsonResponse({items: []}));
			await new ListenHubClient({accessToken: 'tok'}).listSpeakers();

			expect(requestedHosts()).toEqual([FALLBACK_HOST]);
		});

		it('throws the original error when no candidate is reachable', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch.mockRejectedValue(connectionFailure());

			await expect(client.listSpeakers()).rejects.toThrow('fetch failed');
		});

		it('does not switch domains on an HTTP error response', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({code: 401, message: 'unauthorized'}), {
					status: 401,
					headers: {'content-type': 'application/json'},
				}),
			);

			await expect(client.listSpeakers()).rejects.toThrow();
			expect(requestedHosts().every((host) => host === DEFAULT_HOST)).toBe(true);
			expect(fs.existsSync(storePath())).toBe(false);
		});
	});

	describe('non-idempotent requests', () => {
		it('never resends a POST to another domain', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			// 第一次是真实 POST（失败），后续只能是探活 GET。
			mockFetch.mockImplementation(async (input: Request | string) => {
				const request = input instanceof Request ? input : new Request(input);
				if (new URL(request.url).host === DEFAULT_HOST) throw connectionFailure();
				return new Response('{}', {status: 200, headers: {'content-type': 'application/json'}});
			});

			await expect(
				client.createPodcast({
					type: 'podcast-solo',
					query: 'hello',
					template: {type: 'podcast', mode: 'quick', speakers: ['s1'], language: 'en'},
				}),
			).rejects.toThrow(/not resent/);

			const postsToFallback = mockFetch.mock.calls.filter((call) => {
				const input: unknown = call[0];
				const request = input instanceof Request ? input : undefined;
				return request?.method === 'POST' && new URL(request.url).host === FALLBACK_HOST;
			});
			expect(postsToFallback).toHaveLength(0);
		});

		it('records the reachable domain so the retry goes to the alternate host', async () => {
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch.mockImplementation(async (input: Request | string) => {
				const request = input instanceof Request ? input : new Request(input);
				if (new URL(request.url).host === DEFAULT_HOST) throw connectionFailure();
				return new Response('{}', {status: 200, headers: {'content-type': 'application/json'}});
			});

			await expect(
				client.createPodcast({
					type: 'podcast-solo',
					query: 'hello',
					template: {type: 'podcast', mode: 'quick', speakers: ['s1'], language: 'en'},
				}),
			).rejects.toThrow();

			expect(readStore().discovered).toEqual({[DEFAULT_HOST]: FALLBACK_HOST});
		});

		it('sends a POST straight to the selected domain once, with its body intact', async () => {
			writeStore({[DEFAULT_HOST]: FALLBACK_HOST});
			const client = new ListenHubClient({accessToken: 'tok'});
			// ky 在请求结束后会 cancel 掉 body，断言必须在调用时读。
			let sent: {url: string; method: string; auth: string | null; body: unknown} | undefined;
			mockFetch.mockImplementationOnce(async (request: Request) => {
				sent = {
					url: request.url,
					method: request.method,
					auth: request.headers.get('authorization'),
					body: await request.clone().json(),
				};
				return jsonResponse({episodeId: 'ep_1'});
			});

			await client.createPodcast({
				type: 'podcast-solo',
				query: 'hello',
				template: {type: 'podcast', mode: 'quick', speakers: ['s1'], language: 'en'},
			});

			expect(mockFetch).toHaveBeenCalledOnce();
			expect(new URL(sent!.url).host).toBe(FALLBACK_HOST);
			expect(sent!.method).toBe('POST');
			expect(sent!.auth).toBe('Bearer tok');
			expect(sent!.body).toMatchObject({query: 'hello'});
		});
	});

	describe('invalidation', () => {
		it('drops a cached domain that stops working and re-probes the default', async () => {
			writeStore({[DEFAULT_HOST]: FALLBACK_HOST});
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch
				.mockRejectedValueOnce(connectionFailure())
				.mockResolvedValueOnce(jsonResponse({items: []}));

			await client.listSpeakers();

			expect(requestedHosts()).toEqual([FALLBACK_HOST, DEFAULT_HOST]);
			expect(readStore().discovered).toEqual({});
		});
	});

	describe('explicit overrides take over completely', () => {
		it('does not fall back when baseURL is passed', async () => {
			const client = new ListenHubClient({baseURL: 'https://api.listenhub.ai/api'});
			mockFetch.mockRejectedValue(connectionFailure());

			await expect(client.listSpeakers()).rejects.toThrow('fetch failed');
			expect(requestedHosts().every((host) => host === DEFAULT_HOST)).toBe(true);
		});

		it('does not fall back when LISTENHUB_API_URL is set', async () => {
			process.env['LISTENHUB_API_URL'] = 'https://api.listenhub.ai/api';
			const client = new ListenHubClient({});
			mockFetch.mockRejectedValue(connectionFailure());

			await expect(client.listSpeakers()).rejects.toThrow('fetch failed');
			expect(requestedHosts().every((host) => host === DEFAULT_HOST)).toBe(true);
		});

		it('pins the domain named by LISTENHUB_DOMAIN without probing', async () => {
			process.env['LISTENHUB_DOMAIN'] = 'app';
			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch.mockResolvedValueOnce(jsonResponse({items: []}));

			await client.listSpeakers();

			expect(requestedHosts()).toEqual([FALLBACK_HOST]);
			expect(fs.existsSync(storePath())).toBe(false);
		});
	});

	describe('no writable filesystem', () => {
		it('degrades to in-memory selection without failing the request', async () => {
			// 配置目录落在一个普通文件下面：读和写都会失败，等价于浏览器/只读环境。
			const blocker = path.join(configHome, 'not-a-dir');
			fs.writeFileSync(blocker, '');
			process.env['XDG_CONFIG_HOME'] = path.join(blocker, 'nested');
			resetDomainSelectionCache();

			const client = new ListenHubClient({accessToken: 'tok'});
			mockFetch
				.mockRejectedValueOnce(connectionFailure())
				.mockResolvedValueOnce(jsonResponse({items: []}))
				.mockResolvedValueOnce(jsonResponse({items: []}));

			await client.listSpeakers();
			await client.listSpeakers();

			// 第一次吃一次失败切到备选域，同实例后续请求直接走备选域，不再重复失败。
			expect(requestedHosts()).toEqual([DEFAULT_HOST, FALLBACK_HOST, FALLBACK_HOST]);
		});
	});

	describe('OpenAPIClient', () => {
		it('falls back from the marswave default domain', async () => {
			const client = new OpenAPIClient({apiKey: 'lh_sk_test'});
			mockFetch
				.mockRejectedValueOnce(connectionFailure())
				.mockResolvedValueOnce(jsonResponse({items: []}));

			await client.listSpeakers();

			expect(requestedHosts()).toEqual([OPENAPI_DEFAULT_HOST, FALLBACK_HOST]);
			expect(readStore().discovered).toEqual({[OPENAPI_DEFAULT_HOST]: FALLBACK_HOST});
		});

		it('does not fall back when baseURL is passed', async () => {
			const client = new OpenAPIClient({
				apiKey: 'lh_sk_test',
				baseURL: 'https://api.marswave.ai/openapi',
			});
			mockFetch.mockRejectedValue(connectionFailure());

			await expect(client.listSpeakers()).rejects.toThrow('fetch failed');
			expect(requestedHosts().every((host) => host === OPENAPI_DEFAULT_HOST)).toBe(true);
		});
	});
});
