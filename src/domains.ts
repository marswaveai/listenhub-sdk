/**
 * 出厂 Base URL 的唯一事实源：域别名 → 各接口面的完整 Base URL。
 * 换域只改这张表——`client.ts` 的默认 API 域、`openapi-client.ts` 的默认 OpenAPI 域、
 * `domain-selection.ts` 的备选域表都从这里派生，下游 CLI 也直接读它，
 * 不再各自维护一份（issue #728）。
 */
export const DOMAIN_BASE_URLS = {
	default: {
		api: 'https://api.listenhub.ai/api',
		openapi: 'https://api.marswave.ai/openapi',
	},
	app: {
		api: 'https://api.listenhub.app/api',
		openapi: 'https://api.listenhub.app/openapi',
	},
} as const;

/** `LISTENHUB_DOMAIN` 可以填的短名，也是 `DOMAIN_BASE_URLS` 的键。 */
export type DomainAlias = keyof typeof DOMAIN_BASE_URLS;

export function domainHost(baseUrl: string): string {
	return new URL(baseUrl).host;
}
