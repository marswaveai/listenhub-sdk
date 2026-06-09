# Spec：各产品批量删除 —— SDK（listenhub-sdk 部分）

- Issue: `Part of marswaveai/listenhub-ralph#198`
- 涉及仓库：`listenhub-sdk`（本文件）、`listenhub-api-server`、`listenhub-website-fe`
- **定位：可选 / 公开 API 对齐，不在本 issue 关键路径上。** website-fe 自带 `services/client/*`、零 SDK 依赖；#198 的验收标准（前端多选 + 后端 `DELETE /v1/images` + 视频删除收敛）**不需要 SDK 任何改动**。本 PR 仅为给公开 API 消费者补齐图片批量删除能力，可与 website-fe / api-server 解耦、独立排期。
- 本仓库分支：`ralph/listenhub-sdk--198`
- PR body 含 `Part of marswaveai/listenhub-ralph#198`

## 背景与目标

SDK（`src/listenhub.ts`）当前删除能力（v0.0.11）：

- `deleteCreations(params: DeleteEpisodesParams)` → `DELETE v1/episodes { ids }`（`listenhub.ts:178`，`DeleteEpisodesParams = { ids: string[] }`）——**已覆盖** podcast/TTS/storybook/slides/explainer，且后端收敛后**自动覆盖视频**（传视频 episodeId 即软删关联视频任务 + 进行中退积分），SDK 无需新视频方法。
- **无图片删除**方法（仅 `createAIImage` / `getAIImage` / `listAIImages`）。
- **无视频删除**方法（仅 `createVideoGeneration` / `getVideoGenerationTask` / `listVideoGenerationTasks` / `estimate...`）。

本次 SDK 侧仅两件事：
1. **视频删除**：无需新方法——`deleteCreations` 已覆盖。仅补**文档/类型注释**说明语义。
2. **图片批量删除**：新增 `deleteAIImages` 对接后端新接口 `DELETE /v1/images`（依赖 api-server 该接口先上线）。

## 设计（契约）

### 新增 `deleteAIImages`

```ts
async deleteAIImages(params: DeleteAIImagesParams): Promise<void> {
  await this.api.delete('v1/images', { json: params }); // 调用风格对齐 deleteCreations
}
```

- `DeleteAIImagesParams`：`{ ids: string[] }`（与 `DeleteEpisodesParams` 同形）。
- 与 `deleteCreations`（`v1/episodes`）保持相同调用风格（DELETE + json body）。**body 字段名用 `ids`**，与 api-server `DELETE /v1/images { ids }` 及 episodes 一致（注意：banana labs 的 `imageIds` 是另一接口，勿混）。

### `deleteCreations` 文档更新

- 方法/类型注释说明：传入 id 若为 AI 视频的 episodeId，删除会一并软删其视频生成任务并对进行中任务回滚积分；legacy（无 episodeId）视频可传任务 id。
- 若有公开 API 文档（`docs/client.md` 等），同步补图片批量删除与视频删除说明。

### 版本与发布协调

- 新增公开方法属 minor，按既有约定 bump 并更新 changelog。
- **发布协调**：见 [[project_music_openapi_rollout]]——确认当前已发布版本与未发布变更链（SDK / CLI / Raycast 依赖）状态，避免本次发布与在途变更冲突；`deleteAIImages` 依赖后端 `DELETE /v1/images` 已上线后再发版。

## 验收标准

- [ ] 新增 `deleteAIImages({ ids })`，对接 `DELETE /v1/images`，类型与 `deleteCreations` 风格一致、body 字段名为 `ids`。
- [ ] `deleteCreations` 文档/注释标注已覆盖视频删除语义。
- [ ] 版本号与 changelog 更新；与在途未发布变更协调；待后端接口上线后发版。
- [ ] 不引入对旧 `DELETE /v1/video-generation/episodes/:episodeId` 的依赖（统一走 episodes 接口）。

## 范围外

- 语音克隆。
- 文件（GCS/CDN）清理。
- 视频删除专用方法（统一由 `deleteCreations` 承担，不另开 `deleteVideoGeneration`）。
