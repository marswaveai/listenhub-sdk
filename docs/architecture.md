# Architecture

## Dependency Diagram

```
listenhub.ts    ← flat client class, endpoint methods
     |
     v
  client.ts     ← createHttpClient(), parseErrorResponse()
     |
     v
  types/
```

Dependencies flow strictly downward. No module may import from a layer above it.

## Module Responsibilities

### types/

Type definitions only. No runtime logic. Contains interfaces for client options, auth responses, errors, and request options. Every other module depends on types; types depend on nothing.

Key files:

- `client.ts` — ClientOptions interface
- `auth.ts` — ConnectInitResponse, TokenResponse, StoredCredentials
- `settings.ts` — ApiKeyResponse
- `common.ts` — shared types

### errors.ts

`ListenHubError` class. Thrown by the client on non-zero API response codes and HTTP errors.

### client.ts

Exports `createHttpClient(opts)` and `parseErrorResponse()`. All cross-cutting concerns (auth header, token refresh, response unwrapping, error parsing, retry) live in ky hooks configured here. Returns a `KyInstance` ready for use.

Does not know about any specific API endpoint.

### listenhub.ts

`ListenHubClient` class. Exposes a public `api: KyInstance` for advanced custom requests. All API endpoint methods are flat on this class (e.g. `client.refresh()`, `client.checkinSubmit()`). Delegates directly to ky — no intermediate request wrappers.

### src/index.ts

Main entry point. Exports `ListenHubClient` from `listenhub.ts` along with all public types.

## Package Exports

Single entry point:

- `@marswave/listenhub-sdk` — Client and types. Cross-platform core, ESM only. Built by `vp pack` to `dist/`.
