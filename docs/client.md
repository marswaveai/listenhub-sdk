# Client Behavior

The core client (`src/client.ts`) handles all HTTP communication with the ListenHub API. This document covers its key behaviors.

## Request/Response Flow

1. Caller invokes `client.request<T>(method, path, options)`
2. `onRequest` hook fires (if configured)
3. ky sends the HTTP request with bearer token (if set) and configured timeout
4. Response received — `onResponse` hook fires (if configured)
5. Response processing based on status code and content type

## Response Unwrapping

The ListenHub API wraps all responses in `{ code, message, data }`. The client:
- Returns `data` directly when `code === 0`
- Throws `ListenHubError` with the API's `code` and `message` when `code !== 0`
- Returns `undefined` for 204 No Content responses

## Key Conversion

Response bodies are automatically converted from snake_case to camelCase via camelcase-keys. Request bodies are sent as-is (no conversion). Pass `rawKeys: true` in request options to skip response conversion.

## Error Handling

Errors are parsed based on content type:
- **JSON responses** — Extracts `code`, `message`, and `request_id` from the body. If the JSON has a non-zero `code`, throws `ListenHubError` even for 2xx HTTP status.
- **HTML responses** — Typically from gateways/proxies. Extracts the `<title>` tag content and throws with code `GATEWAY_ERROR`.
- **Other content types** — Throws with code `UNKNOWN_ERROR` and the raw response text.

All errors include the HTTP status code and request ID (when available from headers or body).

## 401 Auto-Refresh

When a request returns 401 and `onTokenExpired` is configured:
1. Client calls `onTokenExpired()` to get a new access token
2. Updates the bearer token internally
3. Retries the original request once

Single-flight deduplication: if multiple concurrent requests hit 401 simultaneously, only one refresh call is made. All waiting requests share the result.

The `skipAutoRefresh` option (used internally by `auth.refresh()`) prevents this behavior to avoid infinite refresh loops.

## 429 Rate Limit Retry

When a request returns 429:
1. Client reads the `Retry-After` header for wait duration
2. If no header, uses exponential backoff (1s, 2s, 4s...)
3. Retries up to `maxRetries` times (default: 2)
4. If all retries exhausted, throws the 429 error

## Hooks

- `onRequest(request: Request)` — Called before every request. Can be async.
- `onResponse(response: Response, request: Request)` — Called after every response. Can be async.

Hooks are configured via `ClientOptions` and cannot modify the request/response.
