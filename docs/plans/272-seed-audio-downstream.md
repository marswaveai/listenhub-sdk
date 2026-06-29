# 272 — Seed Audio (seed-audio-1.0) downstream sync to listenhub-sdk

下游同步 `seed-audio-1.0` 的 3 个对外端点，仿 video-generation 通道。

## 范围

只覆盖 3 个对外端点（事实源：listenhub-api-server `src/openapi-controllers/seed-audio.ts`

- `src/service/seed-audio/{request,index}.ts` + `api-docs/listenhub.yaml`）：

* `POST /v1/seed-audio/generate` → `createSeedAudio`（202，返回 `{taskId, status:'pending'}`）
* `GET /v1/seed-audio/tasks` → `listSeedAudioTasks`（`{items, page, pageSize, total}`）
* `GET /v1/seed-audio/tasks/{taskId}` → `getSeedAudioTask`（单 task）

**忽略**：`/v1/seed-audio/voices`、`/v1/seed-audio/estimate-credits`（按要求不纳入）。
不暴露 provider 路由/凭证/内部状态名/DAO/MongoDB/回调内部路径。

## 落地点（双客户端双类型面）

- `src/types/seed-audio.ts`（新建）— ListenHubClient 用 camelCase 类型。
- `src/types/openapi.ts`（编辑）— `OpenAPISeedAudio*` 类型（OpenAPIClient 用，内联 union）。
- `src/openapi-client.ts`（编辑）— OpenAPIClient 三方法 + import。
- `src/listenhub.ts`（编辑）— ListenHubClient 三方法 + import。
- `src/index.ts`（编辑）— 两套类型 re-export。
- `examples/seed-audio.ts`（新建）— 可运行示例（仿 video-generation.ts）。
- `tests/unit/seed-audio.test.ts`（新建）— 覆盖 3 端点成功路径。
- `README.md`（编辑）— ListenHubClient + OpenAPIClient 两处方法表 + Examples 表。

## 关键约束（写进 JSDoc）

- `text` <= 1400；`voices` 1-3；`voices` 与 `image` 互斥；`durationHint` 1-110。
- `model` 字面值 `seed-audio-1.0` 必须与上游 `SeedAudioModel.SEED_AUDIO_1_0` 一致。
- 对外状态仅 5 态；内部 `pending_payment` 不出现在 SDK 联合（上游映射成 generating）。
- 响应 image 形状脱敏为 `{url?, hasData?, thumbnailUrl?}`（永不返回 base64 `data`）；
  `audioUrl` 仅 `status === 'success'` 暴露。

## 验证

`pnpm check` / `pnpm test` / `pnpm build`（+ `pnpm exec tsx examples/seed-audio.ts`
跑到 login，依赖真实凭据，CI 中只验到 import/类型层）。
