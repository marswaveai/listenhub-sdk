# Architecture

## Dependency Diagram

```
adapters/node      adapters/browser
       \              /
        v            v
     resources/auth
           |
           v
       client.ts
           |
           v
        types/
```

Dependencies flow strictly downward. No module may import from a layer above it.

## Module Responsibilities

### types/
Type definitions only. No runtime logic. Contains interfaces for client options, auth responses, adapter contracts, errors, and request options. Every other module depends on types; types depend on nothing.

Key files:
- `adapter.ts` — PlatformAdapter, AuthStrategy, StorageProvider, AuthAPI interfaces
- `client.ts` — ClientOptions interface
- `auth.ts` — ConnectInitResponse, TokenResponse, StoredCredentials
- `common.ts` — ListenHubError class, RequestOptions interface

### client.ts
The HTTP transport layer. Wraps ky with ListenHub-specific behavior: response unwrapping, error parsing, token refresh, rate limit retry, and hooks. Exposes `request<T>(method, path, options)` as the single HTTP primitive all resources use.

Does not know about any specific API endpoint. Does not know about adapters or platform concerns.

### resources/
API endpoint groupings. Each resource is a class that receives a `ListenHubClient` instance and delegates to pure functions in `methods.ts`. Resources know how to call specific API paths but have no knowledge of adapters or platform I/O.

Currently: `auth/` (connect init, connect token, refresh, revoke).

### adapters/
Platform-specific implementations of `PlatformAdapter`. Each adapter composes an `AuthStrategy` (login/logout orchestration) and a `StorageProvider` (credential persistence). Adapters may call resources via the `AuthAPI` interface.

Currently: `node/` (CLI login with local callback server, file-based credentials), `browser/` (localStorage credentials, no direct login).

### src/index.ts
The main entry point. Defines a `ListenHubClient` subclass whose constructor wires up `AuthResource`. This is the only place where resources and client are assembled together, avoiding circular dependencies.

## Package Exports

Three separate entry points, each built independently by tsup:

- `@marswave/listenhub-sdk` — Core client + types. Platform-agnostic.
- `@marswave/listenhub-sdk/node` — NodeAdapter. Only available in Node.js environments (enforced by package.json conditional exports).
- `@marswave/listenhub-sdk/browser` — BrowserAdapter. Available in browser bundlers.

Export paths are defined in `package.json` exports field. New sub-paths require corresponding entries in both `package.json` exports and `tsup.config.ts` entry points.
