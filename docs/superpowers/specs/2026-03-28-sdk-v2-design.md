# ListenHub SDK v2 Design Spec

## Overview

A comprehensive refactor of listenhub-sdk covering 8 improvements: adapter abstraction layer, ky HTTP client, user hooks, content-type error parsing, camelCase/snake_case parameter conversion, API function extraction, mock server testing, and TypeDoc generation. Inspired by patterns from fanfou-sdk-node.

## 1. Adapter Abstraction Layer

### Problem

The current `src/adapters/cli-auth/` is tightly coupled to the CLI login scenario. The SDK targets 4 environments (Node CLI, browser, desktop, mobile) with multiple adapter needs (auth, storage, file IO, notifications).

### Design

Define a `PlatformAdapter` interface that each environment implements:

```ts
// src/types/adapter.ts
// NOTE: This file must NOT import from client.ts. AuthStrategy receives
// a minimal AuthAPI interface (defined here in types/) to preserve the
// dependency direction: adapters → resources → client → types.

/** Minimal surface that AuthStrategy needs — implemented by AuthResource */
interface AuthAPI {
  cliInit(params: { callbackPort: number }): Promise<CliInitResponse>
  cliToken(params: { sessionId: string; code: string }): Promise<TokenResponse>
  refresh(params: { refreshToken: string }): Promise<TokenResponse>
  revoke(params: { refreshToken: string }): Promise<void>
}

interface AuthStrategy {
  login(authAPI: AuthAPI): Promise<TokenResponse>
  logout(authAPI: AuthAPI): Promise<void>
}

interface StorageProvider {
  load(): Promise<StoredCredentials | null>
  save(credentials: StoredCredentials): Promise<void>
  clear(): Promise<void>
}

interface FileIOProvider {
  readFile(path: string): Promise<ReadableStream | Blob>
}

interface NotifyProvider {
  notify(message: string, options?: NotifyOptions): Promise<void>
}

interface PlatformAdapter {
  auth: AuthStrategy
  storage: StorageProvider
  fileIO?: FileIOProvider
  notify?: NotifyProvider
}
```

`AuthResource` implements `AuthAPI` naturally (same method signatures). The client passes `this.auth` (the `AuthResource` instance) to `adapter.auth.login(this.auth)`. The types layer never imports `ListenHubClient`, keeping the dependency direction clean: `adapters → resources → client → types`.

### Client injection

```ts
const client = new ListenHubClient({
  adapter: new NodeCLIAdapter(),
})
```

Client accesses capabilities via `this.adapter.storage.load()` etc. Core layer never imports environment-specific code.

### Built-in adapters

| Adapter | Export subpath | Environment |
|---------|---------------|-------------|
| `NodeCLIAdapter` | `@marswave/listenhub-sdk/node` | Node.js CLI |
| `BrowserAdapter` | `@marswave/listenhub-sdk/browser` | Browser SPA |

Desktop and mobile: users implement `PlatformAdapter` themselves.

### Export migration from v1

This is a **semver major** change (v0 → v1, or v0.x breaking). Migration path:

| v1 subpath | v2 subpath | Status |
|------------|------------|--------|
| `@marswave/listenhub-sdk` | `@marswave/listenhub-sdk` | **Preserved** (core client + types) |
| `@marswave/listenhub-sdk/cli-auth` | `@marswave/listenhub-sdk/node` | **Renamed** — `./cli-auth` is removed |

`./cli-auth` is **not** kept as an alias. It is removed entirely. Users must update imports to `./node`. Since we are pre-1.0 (`0.1.0`), this is an acceptable breaking change per semver convention. The CHANGELOG and migration guide should document the rename.

### NodeCLIAdapter constructor

```ts
new NodeCLIAdapter({
  tokenStorePath?: string  // default: ~/.listenhub/credentials.json
})
```

Storage path is baked into the adapter instance at construction time.

### Relationship: adapter.auth vs client.auth

These are two separate concerns that coexist:

- **`adapter.auth`** (`AuthStrategy`): orchestrates the login/logout *flow* (open browser, wait for callback, store credentials). Called by convenience functions like `createAuthenticatedClient()`. Receives an `AuthAPI` interface (not the full client).
- **`client.auth`** (`AuthResource`): wraps auth API *endpoints* (`/v1/auth/token`, `/v1/auth/cli/init`, etc.). Implements `AuthAPI`. Used by adapter.auth internally, and available for direct use.

`AuthStrategy.login()` receives `authAPI` (the `AuthResource` instance), calls `authAPI.cliInit()` / `authAPI.cliToken()` internally, then calls `adapter.storage.save()` to persist.

### Migration from current cli-auth

- Login flow (browser callback) -> `NodeCLIAdapter.auth`
- Credential file IO -> `NodeCLIAdapter.storage`
- `createAuthenticatedClient()` preserved as convenience, internally assembles adapter

## 2. Client Layer: ky + hooks + error parsing

### ky replaces hand-written fetch

Current `client.ts` manually implements timeout (AbortController), JSON parsing, response unwrapping. Replace with ky:

```ts
import ky from 'ky'

this.http = ky.create({
  prefixUrl: baseURL,
  timeout: options.timeout ?? 30_000,
  throwHttpErrors: false,   // We handle errors ourselves via parseErrorResponse
  retry: 0,                 // Disable ky's built-in retry entirely
  hooks: { /* see below */ }
})
```

#### Architecture baseline change

This is a deliberate departure from the v1 "zero HTTP dependency / built-in fetch" baseline. Rationale:

- **ky is a thin fetch wrapper** (~3.5 kB minified+gzip), not a heavy HTTP library. It uses the native Fetch API underneath.
- **Eliminates ~120 lines** of hand-written timeout, header injection, and response handling.
- **Hooks system** gives us clean extension points (beforeRequest, afterResponse) instead of ad-hoc logic.
- **Runtime matrix**: ky supports all our targets — Node 18+ (native fetch), browsers, Deno. No polyfill needed.
- **Trade-off**: one new runtime dependency, slightly larger bundle. Acceptable given the maintenance reduction.

#### Error handling strategy: throwHttpErrors: false

ky is configured with `throwHttpErrors: false` so that non-2xx responses are returned as normal `Response` objects. The `request()` method checks `response.ok` and routes to `parseErrorResponse()` for content-type aware error construction. This avoids fighting ky's default `HTTPError` and gives us full control over error shaping.

#### Retry strategy: fully self-managed

ky's built-in retry is disabled (`retry: 0`) because:

1. **ky defaults `retry.methods` to `['GET']`** — our auth endpoints are POST, and many future endpoints will be non-idempotent. Expanding retry methods globally is unsafe.
2. **401 token refresh** is not a simple retry — it requires a single-flight refresh call, then replaying the original request with the new token.
3. **429 backoff** needs to read `Retry-After` header and fall back to exponential backoff, which is custom logic regardless.

Both 401 and 429 retry are implemented in the `request()` method (same location as v1), not in ky hooks:

```ts
async request<T>(method, path, options): Promise<T> {
  const response = await this.http(path, { method, ... })

  // User onResponse hook (raw Response for logging)
  await this.options.onResponse?.(response, request)

  if (response.ok) {
    // unwrap { code, data } + camelCase conversion
  }

  // 401: single-flight token refresh + replay (once)
  if (response.status === 401 && !options.skipAutoRefresh && this.onTokenExpired) {
    // ... same single-flight logic as v1
  }

  // 429: exponential backoff with Retry-After
  if (response.status === 429 && retryCount < maxRetries) {
    // ... same backoff logic as v1
  }

  // All other errors
  throw await parseErrorResponse(response)
}
```

This keeps retry logic explicit, idempotency-safe, and independent of ky's retry plumbing.

### User-facing hooks

```ts
interface ClientOptions {
  // ...existing options
  onRequest?: (request: Request) => void | Promise<void>
  onResponse?: (response: Response, request: Request) => void | Promise<void>
}
```

Execution order: ky `beforeRequest` hook injects Bearer token first, then calls user `onRequest`. User `onResponse` is called in `request()` after receiving the response, before error/unwrap logic.

### Content-type aware error parsing

Current code assumes backend always returns JSON. Gateways (Nginx/Cloudflare) may return HTML. Error parsing runs in the `request()` method on non-2xx responses, before camelCase conversion:

```ts
async function parseErrorResponse(response: Response): Promise<ListenHubError> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await response.json()
    return new ListenHubError({
      status: response.status,
      code: String(body.code),
      message: body.message,
      requestId: body.request_id,
    })
  }

  if (contentType.includes('text/html')) {
    const html = await response.text()
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    return new ListenHubError({
      status: response.status,
      code: 'GATEWAY_ERROR',
      message: title ?? `HTTP ${response.status}`,
    })
  }

  return new ListenHubError({
    status: response.status,
    code: 'UNKNOWN_ERROR',
    message: `HTTP ${response.status}`,
  })
}
```

### Parameter camelCase <-> snake_case conversion

The backend expects snake_case request bodies and returns snake_case responses. The current code already sends camelCase (e.g., `grantType`, `refreshToken`) which works because the backend is tolerant, but this is not the canonical format.

Default behavior in `request()`:

```ts
import camelcaseKeys from 'camelcase-keys'
import decamelizeKeys from 'decamelize-keys'

// Request body: decamelize before sending
if (body) options.json = decamelizeKeys(body, { deep: true })

// Response data: camelize after receiving
return camelcaseKeys(data, { deep: true })
```

Note: error parsing (`parseErrorResponse`) reads raw snake_case keys (`body.request_id`) before conversion is applied. Conversion only applies to successful response data.

Opt-out via `rawKeys: true` in `RequestOptions` for APIs where auto-conversion is not appropriate.

## 3. API Function Extraction

### Current pattern

Methods live directly in Resource classes. Works for now with only `AuthResource`, but will bloat as resources grow.

### New pattern

Extract each method as an independent function. Resource class becomes a thin delegate:

```ts
// src/resources/auth/methods.ts
export async function refresh(client: ListenHubClient, params: { refreshToken: string }) {
  return client.request<TokenResponse>('POST', '/v1/auth/token', {
    body: { grantType: 'refresh_token', refreshToken: params.refreshToken },
    skipAutoRefresh: true,  // Prevents recursive 401 refresh loop
  })
}

export async function cliInit(client: ListenHubClient, params: { callbackPort: number }) {
  return client.request<CliInitResponse>('POST', '/v1/auth/cli/init', { body: params })
}

export async function cliToken(client: ListenHubClient, params: { sessionId: string; code: string }) {
  return client.request<TokenResponse>('POST', '/v1/auth/cli/token', { body: params })
}

export async function revoke(client: ListenHubClient, params: { refreshToken: string }) {
  return client.request<void>('POST', '/v1/auth/token/revoke', { body: params })
}

// src/resources/auth/index.ts
import * as methods from './methods.js'

class AuthResource {
  constructor(private client: ListenHubClient) {
    client._setAuth(this)
  }
  refresh(params: { refreshToken: string }) { return methods.refresh(this.client, params) }
  cliInit(params: { callbackPort: number }) { return methods.cliInit(this.client, params) }
  cliToken(params: { sessionId: string; code: string }) { return methods.cliToken(this.client, params) }
  revoke(params: { refreshToken: string }) { return methods.revoke(this.client, params) }
}
```

Benefits: each method is independently testable without instantiating the Resource class.

### Directory structure

```
src/resources/
├── auth/
│   ├── methods.ts    # Pure functions
│   └── index.ts      # AuthResource delegate class
├── <future>/
│   ├── methods.ts
│   └── index.ts
```

New resource pattern unchanged: create resource dir, add methods.ts + index.ts, mount in `src/index.ts`.

## 4. Testing: Mock Server Layer

### Current state

Unit tests mock `global.fetch` via vitest. Good coverage but low integration confidence.

### New layer: integration tests with Express mock server

```ts
// tests/fixtures/server.ts
import express from 'express'

export function createMockServer() {
  const app = express()

  app.get('/api/some-resource', (req, res) => {
    res.json({ code: 0, message: 'ok', data: { ... } })
  })

  app.get('/api/gateway-error', (req, res) => {
    res.status(502).type('html').send('<html><title>Bad Gateway</title></html>')
  })

  app.get('/api/rate-limited', (req, res) => {
    res.status(429).set('Retry-After', '1').json({ code: 42900, message: 'rate limited' })
  })

  return app
}
```

### Test directory structure

```
tests/
├── unit/
│   └── client.test.ts        # Existing tests, mock ky
├── integration/
│   └── client.test.ts        # Mock server, full HTTP round-trip
└── fixtures/
    ├── server.ts              # Express mock server
    └── mocks.ts               # Shared test data
```

New dev dependencies: `express`, `@types/express`, `get-port`.

Note: ky uses the Fetch API internally. Integration tests run in Node 18+ where native `fetch` is available — no polyfill needed.

## 5. TypeDoc

### Configuration

```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "exclude": ["**/adapters/**"],
  "plugin": ["typedoc-plugin-markdown"]
}
```

### Integration

- `package.json` script: `"docs": "typedoc"`
- Generates Markdown API docs to `docs/api/`
- Adapter subpath docs excluded from core API docs (environment-specific)

New dev dependencies: `typedoc`, `typedoc-plugin-markdown`.

## Dependency Changes Summary

### Runtime (new)

| Package | Purpose |
|---------|---------|
| `ky` | HTTP client replacing hand-written fetch |
| `camelcase-keys` | Response key conversion |
| `decamelize-keys` | Request key conversion |

### Runtime (removed)

| Package | Reason |
|---------|--------|
| `open` | Moves from runtime dep to NodeCLIAdapter-only (still needed, but scoped) |

### Dev (new)

| Package | Purpose |
|---------|---------|
| `express` | Mock server for integration tests |
| `@types/express` | Types |
| `get-port` | Dynamic port allocation for test server |
| `typedoc` | API documentation generation |
| `typedoc-plugin-markdown` | Markdown output format |

## File Changes Summary

| Change | Files |
|--------|-------|
| New | `src/types/adapter.ts` |
| New | `src/adapters/node/index.ts` (NodeCLIAdapter) |
| New | `src/adapters/browser/index.ts` (BrowserAdapter) |
| New | `src/resources/auth/methods.ts` |
| New | `tests/integration/client.test.ts` |
| New | `tests/fixtures/server.ts`, `tests/fixtures/mocks.ts` |
| New | `typedoc.json` |
| Rewrite | `src/client.ts` (ky, hooks, error parsing, param conversion) |
| Rewrite | `src/types/client.ts` (ClientOptions with adapter + hooks) |
| Refactor | `src/resources/auth/index.ts` (delegate to methods.ts) |
| Refactor | `src/adapters/cli-auth/` -> split into `src/adapters/node/` |
| Update | `src/index.ts` (adapter injection) |
| Update | `package.json` (deps, exports, scripts) |
| Update | `tsup.config.ts` (new entry points) |
| Update | `tests/unit/client.test.ts` (mock ky instead of fetch) |
