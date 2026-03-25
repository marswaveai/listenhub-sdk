# Contributing

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io/)

## Getting Started

```sh
git clone https://github.com/marswaveai/listenhub-sdk.git
cd listenhub-sdk
pnpm install
pnpm build
```

## Testing

```sh
pnpm test            # Unit + integration tests
pnpm test:watch      # Watch mode
pnpm test:e2e        # E2E tests (requires .env.staging)
```

See [docs/testing.md](docs/testing.md) for test layer details and conventions.

## Code Style

```sh
pnpm check           # Format (oxfmt) + lint (oxlint) + type check
```

All checks must pass before submitting a PR.

## Pull Requests

1. Branch from `main`
2. Include tests for new functionality
3. Run `pnpm check` and `pnpm test` before pushing
4. Keep PRs focused — one feature or fix per PR
