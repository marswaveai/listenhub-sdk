# Testing

Tests are organized in three layers, each with a specific purpose and approach.

## Test Layers

### Unit Tests — `tests/unit/`

Test modules in isolation by mocking `global.fetch`.

- `client.test.ts` — Core client behavior: requests, headers, response unwrapping, error parsing (JSON/HTML/unknown), 401 error handling, 429 retry with backoff
- `auth.test.ts` — AuthResource methods (connectInit, connectToken, refresh, revoke) tested with real client instance and stubbed fetch
- `checkin.test.ts` — CheckinResource methods (checkin, status) including error cases (duplicate checkin code 28101)
- `settings.test.ts` — SettingsResource methods (getApiKey, regenerateApiKey)

### Integration Tests — `tests/integration/`

Test real HTTP communication against a local Express mock server.

- `client.test.ts` — Full request/response cycle over actual network. The mock server (`tests/fixtures/server.ts`) provides endpoints for standard responses, errors, rate limiting, and auth flows.

The mock server uses `get-port` for dynamic port allocation to avoid conflicts.

### E2E Tests — `tests/e2e/`

Test against the real staging API. Require `.env.staging` configuration.

- `client.test.ts` — Real API calls with a valid access token
- `checkin.test.ts` — Real checkin endpoints with success and duplicate error paths
- `login.test.ts` — Interactive browser login flow (requires human interaction)

## Running Tests

- `pnpm test` — All tests except E2E
- `pnpm test:watch` — Watch mode (excludes E2E)
- `pnpm test:e2e` — E2E client + checkin tests (needs `.env.staging`)
- `pnpm test:login` — Interactive login test (needs `.env.staging`, opens browser)

## E2E Configuration

Copy `.env.example` to `.env.staging` and fill in:

- `LISTENHUB_API_URL` — Staging API base URL
- `LISTENHUB_ACCESS_TOKEN` — Valid access token (60-day expiry)
- `LISTENHUB_REFRESH_TOKEN` — Valid refresh token (30-day expiry)

## Mock Server

The test fixture server (`tests/fixtures/server.ts`) provides:

- Standard JSON endpoints with `{ code, message, data }` wrapping
- Error endpoints (4xx, 5xx) with various content types
- Rate limit endpoint (429 with Retry-After)
- Auth-protected endpoint (checks Bearer token)

Used by integration tests. Starts on a random available port per test suite.

## Conventions

- Unit tests mock `global.fetch` — no network calls
- Integration tests use real HTTP to local mock server — validates ky behavior end-to-end
- E2E tests hit real APIs — validates actual backend contract
- Each test file is self-contained with its own setup/teardown
