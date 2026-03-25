# ListenHub SDK

JavaScript SDK for ListenHub API. Flat architecture: all endpoint methods live directly on the client class, backed by a ky-native hooks-based HTTP layer.

## Architecture

- **Dependency direction**: `listenhub.ts → client.ts → types/` (one-way, never reverse)
- Entry `src/index.ts` exports `ListenHubClient` from `listenhub.ts`

See `docs/architecture.md` for dependency diagram and module responsibilities.

## Client Core Behavior

- Built on `ky` (fetch wrapper), `throwHttpErrors: true` (ky default), hooks-based
- Backend response `{ code: 0, message, data }`: afterResponse hook unwraps `data` on code 0, throws `ListenHubError` on non-0
- Response body returned as-is (backend returns camelCase natively); request body sent as-is
- `accessToken` accepts a static string or a getter function `() => string | undefined`
- 429 → ky native retry reads `Retry-After` header, up to `maxRetries` times
- `client.api` (KyInstance) exposed for advanced custom requests

See `docs/client.md` for detailed error handling and retry logic.

## Build & Test

- `vp pack` library build, ESM only, output to `dist/`
- `vp test` test runner (vitest) — see `docs/testing.md` for structure and conventions
- `vp lint` for linting (oxlint), `vp fmt` for formatting (oxfmt)
- `vp check` runs format, lint, and type checks together
- E2E tests require `.env.staging` — see `.env.example` for template
