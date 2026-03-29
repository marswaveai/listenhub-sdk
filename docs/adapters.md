# Adapters

Adapters encapsulate platform-specific behavior behind the `PlatformAdapter` interface. This keeps the core client and resources platform-agnostic.

## PlatformAdapter Interface

Defined in `src/types/adapter.ts`. Composed of:

- **AuthStrategy** (required) — Orchestrates login and logout flows. Receives an `AuthAPI` object to call auth endpoints without depending on `AuthResource` directly.
- **StorageProvider** (required) — Persists, loads, and clears credentials. Each platform stores credentials differently (files, localStorage, etc).
- **FileIOProvider** (optional) — File reading capability. Reserved for future use.
- **NotifyProvider** (optional) — Notification capability. Reserved for future use.

## AuthAPI Contract

`AuthAPI` is the minimal interface adapters use to interact with auth endpoints. It contains four methods: `connectInit`, `connectToken`, `refresh`, `revoke`. This interface is the boundary between adapters and resources — adapters never import `AuthResource` directly.

## NodeAdapter

Entry point: `src/adapters/node/index.ts`
Import path: `@marswave/listenhub-sdk/node`

Provides CLI-based OAuth login and file-based credential storage for Node.js environments.

### Login Flow
1. Starts a local HTTP server on an ephemeral port to receive the OAuth callback
2. Calls `connectInit` with the callback port to get an auth URL and session ID
3. Opens the auth URL in the user's default browser
4. Waits for the browser to redirect back to the local server with an authorization code
5. Exchanges the code via `connectToken` for access and refresh tokens
6. Saves credentials to disk and shuts down the local server

Configurable via `NodeAdapterOptions`: custom token storage path, custom browser opener function, login timeout (default 5 minutes).

### Credential Storage
File: `~/.listenhub/credentials.json` (configurable)

Security measures:
- Directory created with 0700 permissions
- File written with 0600 permissions
- Atomic writes: writes to temp file first, then renames to target path

Implementation in `src/adapters/node/credentials.ts`.

### Convenience Functions
- `loadCredentials(options)` — Load stored credentials, auto-refresh if expiring within 60 seconds
- `createAuthenticatedClient(options)` — Create a pre-authenticated client with token refresh wired up

## BrowserAdapter

Entry point: `src/adapters/browser/index.ts`
Import path: `@marswave/listenhub-sdk/browser`

Provides localStorage-based credential storage for browser environments.

### Login
Does not support direct login — throws an error guiding the developer to implement OAuth flow in their application. The browser adapter is designed for applications that handle their own login UI and just need credential persistence.

### Credential Storage
Uses `localStorage` with key `listenhub_credentials`. All operations silently catch errors to handle environments where localStorage is unavailable (SSR, web workers).

## Adding a New Adapter

1. Create `src/adapters/<name>/index.ts` implementing `PlatformAdapter`
2. Add sub-path export in `package.json` (with appropriate conditional exports)
3. Add entry point in `tsup.config.ts`
4. The adapter should only depend on `AuthAPI` interface for auth operations, not on `AuthResource`
