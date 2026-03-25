import ky, {type KyInstance} from 'ky';
import type {ClientOptions} from './types/client.js';
import {ListenHubError} from './errors.js';

export type {KyInstance};

const DEFAULT_BASE_URL = process.env['LISTENHUB_API_URL'] || 'https://api.listenhub.ai/api';
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
	const baseURL = opts.baseURL ?? DEFAULT_BASE_URL;
	const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
	const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

	return ky.create({
		prefixUrl: baseURL,
		timeout,
		retry: {
			limit: maxRetries,
			methods: ['get', 'post', 'put', 'patch', 'delete'],
			statusCodes: [429],
			shouldRetry({error}) {
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
