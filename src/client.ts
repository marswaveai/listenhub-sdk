import ky, {type KyInstance} from 'ky';
import type {ClientOptions} from './types/client.js';
import {ListenHubError} from './errors.js';
import {createDomainSelectingFetch, DomainSwitchedError} from './domain-selection.js';

export type {KyInstance};

const FACTORY_BASE_URL = 'https://api.listenhub.ai/api';
const PROBE_PATH = '/api/v1/users/me';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;

export async function parseErrorResponse(response: Response): Promise<ListenHubError> {
	const contentType = response.headers.get('content-type') ?? '';

	if (contentType.includes('application/json')) {
		try {
			const body = (await response.json()) as {
				code?: unknown;
				message?: string;
				request_id?: string;
			};
			return new ListenHubError({
				status: response.status,
				code: String(body.code),
				message: body.message ?? `Error ${body.code}`,
				requestId: body.request_id,
			});
		} catch {
			// JSON parse failed, fall through
		}
	}

	if (contentType.includes('text/html')) {
		try {
			const html = await response.text();
			const title = html.match(/<title>(.*?)<\/title>/i)?.[1];
			return new ListenHubError({
				status: response.status,
				code: 'GATEWAY_ERROR',
				message: title ?? `HTTP ${response.status}`,
			});
		} catch {
			// text read failed, fall through
		}
	}

	return new ListenHubError({
		status: response.status,
		code: 'UNKNOWN_ERROR',
		message: response.statusText || `HTTP ${response.status}`,
	});
}

export function createHttpClient(opts: ClientOptions = {}): KyInstance {
	// 显式指定 Base URL（选项或环境变量）优先级最高，完全接管，不参与域选择。
	const explicitBaseURL = opts.baseURL ?? globalThis.process?.env?.['LISTENHUB_API_URL'];
	const baseURL = explicitBaseURL ?? FACTORY_BASE_URL;
	const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
	const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
	const domainFetch = explicitBaseURL
		? undefined
		: createDomainSelectingFetch({
				defaultHost: new URL(FACTORY_BASE_URL).host,
				probePath: PROBE_PATH,
			});

	return ky.create({
		prefixUrl: baseURL,
		timeout,
		...(domainFetch ? {fetch: domainFetch} : {}),
		retry: {
			limit: maxRetries,
			methods: ['get', 'post', 'put', 'patch', 'delete'],
			statusCodes: [429],
			shouldRetry({error}) {
				// 域已切换的非幂等请求绝不重发，否则 ky 会把它发去新域
				if (error instanceof DomainSwitchedError) return false;
				// Allow ky to retry 429 (converted to ListenHubError by beforeError)
				if (error instanceof ListenHubError && error.status === 429) return true;
				// Never retry other ListenHubError thrown from afterResponse hooks
				if (error instanceof ListenHubError) return false;
				// Fall through to default behavior for other errors
				return undefined as unknown as boolean;
			},
		},
		hooks: {
			beforeRequest: [
				async (request) => {
					const token =
						typeof opts.accessToken === 'function' ? opts.accessToken() : opts.accessToken;
					if (token) {
						request.headers.set('Authorization', `Bearer ${token}`);
					}
				},
			],
			afterResponse: [
				// Hook 1: {code, data} unwrap (ok responses only)
				async (_request, _options, response) => {
					if (!response.ok) return;
					if (response.status === 204) return;
					if (!response.headers.get('content-type')?.includes('application/json')) return;

					const body = (await response.clone().json()) as {
						code: number;
						message?: string;
						data: unknown;
						request_id?: string;
					};

					if (body.code !== 0) {
						throw new ListenHubError({
							status: response.status,
							code: String(body.code),
							message: body.message ?? `Error ${body.code}`,
							requestId: body.request_id,
						});
					}

					return new Response(JSON.stringify(body.data), {
						status: response.status,
						headers: response.headers,
					});
				},

				// Hook 2: error handling for non-ok (skip 429 for ky retry)
				async (_request, _options, response) => {
					if (response.ok || response.status === 429) return;
					throw await parseErrorResponse(response.clone());
				},
			],
			beforeError: [
				// Catches HTTPError from exhausted 429 retries
				async (error) => {
					throw await parseErrorResponse(error.response.clone());
				},
			],
		},
	});
}
