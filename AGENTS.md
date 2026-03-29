# ListenHub SDK

TypeScript SDK for ListenHub API. Core + Adapter layered architecture: Core is cross-platform HTTP client, Adapters handle environment-specific I/O (CLI login, file storage, browser storage).

## Architecture

- **Dependency direction**: `adapters/ → resources/ → client.ts → types/` (one-way, never reverse)
- **resources/** are independent of each other, each mounted on `ListenHubClient`
- **adapters/** may call resources and client; resources must NOT import adapters
- Entry `src/index.ts` assembles `AuthResource` via subclass to avoid circular deps
- Sub-path exports: `./node` (Node only), `./browser` (browser only), controlled by `package.json exports`

See `docs/architecture.md` for dependency diagram and module responsibilities.

## Client Core Behavior

- Built on `ky` (fetch wrapper), `throwHttpErrors: false`, `retry: 0`
- Backend response `{ code: 0, message, data }`: code 0 unwraps data, non-0 throws `ListenHubError`
- Response body auto-camelized via `camelcase-keys`; request body sent as-is (no decamelization); `rawKeys: true` skips response conversion
- 401 → `onTokenExpired` callback → refresh token → retry once (single-flight dedup prevents concurrent refresh storms)
- 429 → reads `Retry-After` header or exponential backoff → retries up to `maxRetries` times
- `auth.refresh()` sets `skipAutoRefresh: true` internally to prevent 401 recursion
- Hooks: `onRequest(req)`, `onResponse(res, req)` fire on every request
- Content-type aware error parsing: JSON → `code`/`message`/`request_id`; HTML → `<title>` as `GATEWAY_ERROR`; other → `UNKNOWN_ERROR`

See `docs/client.md` for detailed error handling and retry logic.

## Adapter System

`PlatformAdapter` is the unified adapter interface defined in `src/types/adapter.ts`, composed of: `AuthStrategy` (login/logout), `StorageProvider` (credential persistence), and optional `FileIOProvider` / `NotifyProvider`.

`AuthAPI` is the minimal auth interface exposed by resources to adapters: `connectInit`, `connectToken`, `refresh`, `revoke`. Adapters depend on this interface, not on `AuthResource` directly.

See `docs/adapters.md` for adapter contracts and existing implementations.

## Credential Management

- Node storage path: `~/.listenhub/credentials.json` (0600 permissions, atomic write via temp-file rename)
- `loadCredentials` proactively refreshes tokens 60 seconds before expiry
- `onTokenExpired` chain: read file → refresh API → atomic write back → return new token

## Adding a Resource Module

1. Pure functions in `src/resources/<name>/methods.ts` (first param is `client`)
2. Class in `src/resources/<name>/index.ts` delegating to methods
3. Instantiate and mount in `src/index.ts` subclass constructor
4. Types in `src/types/<name>.ts`, re-exported from `src/index.ts`

## Adding an Adapter

1. Implement `PlatformAdapter` in `src/adapters/<name>/index.ts`
2. Add sub-path in `package.json` exports (no wildcards)
3. Add entry point in `tsup.config.ts`

## Build & Test

- `tsup` multi-entry build (index + node + browser), ESM + CJS dual format
- `vitest` tests organized in layers — see `docs/testing.md` for structure and conventions
- `tsc --noEmit` for type checking
- E2E tests require `.env.staging` — see `.env.example` for template
