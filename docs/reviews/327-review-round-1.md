# 327 Review Round 1

## Scope

- Fix AI Video reference-media metadata drift for SDK request/response types and examples.

## Evidence

- `pnpm check`: PASS.
- `pnpm test`: PASS, 12 files / 91 tests.
- `pnpm build`: PASS.
- `git diff --check`: PASS.

## Local Review

- Goal fit: SDK now exposes top-level `referenceImages` / `referenceVideos` for create and estimate paths, supports nested media metadata for compatibility, and returns metadata in task/list params.
- Regression coverage: unit tests assert regular client and OpenAPI client forward metadata in JSON bodies.
- Risk: no HTTP behavior changed; this is a typed pass-through update.

## Gate Status

- Judgment: Needs More Evidence.
- Reason: independent reviewer isolation was not run because the available multi-agent tool requires explicit user authorization for subagents. This record is a local self-review only; PR requires human review.
