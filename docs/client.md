# Client Behavior

The core HTTP client (`src/client.ts`) configures a ky instance via hooks. All cross-cutting concerns live in those hooks. This document covers key behaviors.

## Request/Response Flow

1. Caller invokes an endpoint method on `ListenHubClient` (e.g. `client.refresh()`)
2. ky executes `beforeRequest` hooks — auth header is set here
3. ky sends the HTTP request
4. ky executes `afterResponse` hooks in order:
   - Hook 1: `{ code, data }` unwrapping — returns a new `Response` containing only `data`
   - Hook 2: non-429 error parsing — throws `ListenHubError` for error responses
5. If ky exhausts all 429 retries, `beforeError` hook parses the final error

## Usage

```ts
import { ListenHubClient } from "@marswave/listenhub-sdk";

// Static token
const client = new ListenHubClient({
  baseUrl: "https://api.example.com",
  accessToken: "my-token",
});

// Token getter (called on every request)
const client = new ListenHubClient({
  baseUrl: "https://api.example.com",
  accessToken: () => getTokenFromStorage(),
});

// Advanced: direct ky access
const raw = await client.api.get("v1/custom-endpoint").json();
```

## accessToken

`accessToken` accepts either a static string or a getter function `() => string | undefined`. When a getter is provided, it is called before every request so the client always uses the current token without needing to be recreated.

## Response Unwrapping

The ListenHub API wraps all responses in `{ code, message, data }`. An `afterResponse` hook:

- Returns a new `Response` containing only `data` when `code === 0`
- Throws `ListenHubError` with the API's `code` and `message` when `code !== 0`
- Returns `undefined` for 204 No Content responses

Callers receive the unwrapped `data` directly — no wrapper object is ever exposed.

## Error Handling

Errors follow two paths depending on when they are detected:

**afterResponse hook 4** (non-429, non-401 errors): parses the response body based on content type and throws `ListenHubError`:

- **JSON responses** — Extracts `code`, `message`, and `request_id` from the body.
- **HTML responses** — Typically from gateways/proxies. Extracts the `<title>` tag content and throws with code `GATEWAY_ERROR`.
- **Other content types** — Throws with code `UNKNOWN_ERROR` and the raw response text.

**beforeError hook** (exhausted 429 retries): ky calls this after all retries are spent. The hook parses the final 429 response using the same content-type logic and re-throws as `ListenHubError`.

All errors include the HTTP status code and request ID (when available from headers or body).

## 429 Rate Limit Retry

429 retries are handled natively by ky's retry system:

1. ky reads the `Retry-After` header for wait duration
2. Retries up to `maxRetries` times (default: 2)
3. If all retries are exhausted, ky throws and `beforeError` parses the final response
