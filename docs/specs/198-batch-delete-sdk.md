# Spec：各产品批量删除 —— SDK（listenhub-sdk 部分）

- Issue: `Part of marswaveai/listenhub-ralph#198`
- 涉及仓库：`listenhub-sdk`（本文件）、`listenhub-api-server`、`listenhub-website-fe`
- 交付方式：三个 PR，各落对应子仓库，PR body 均含 `Part of marswaveai/listenhub-ralph#198`
- 本仓库分支：`ralph/listenhub-sdk--198`

## 背景与目标

SDK（`src/listenhub.ts`）当前删除能力：

- `deleteCreations(params)` → `DELETE v1/episodes { ids }`（覆盖 podcast/TTS/storybook/slides/explainer）。
- **无图片删除**方法（仅 `createAIImage` / `getAIImage` / `listAIImages`）。
- **无视频删除**方法（仅 `createVideoGeneration` / `getVideoGenerationTask` / `listVideoGenerationTasks` / `estimate...`）。

本次后端把视频删除统一进 `DELETE /v1/episodes`，并新增图片批量删除 `DELETE /v1/images`。SDK 相应对齐：

1. **视频删除**：无需新方法 —— `deleteCreations` 现已覆盖视频（传视频 episodeId 即可，后端会软删关联视频任务并对进行中任务退积分）。本次只补**文档/类型注释**说明这一点。
2. **图片批量删除**：新增 `deleteAIImages` 方法对接新接口。

## 设计（契约）

### 新增 `deleteAIImages`

```ts
async deleteAIImages(params: DeleteAIImagesParams): Promise<void> {
  await this.api.n('v1/images', { json: params });
}
```

- `DeleteAIImagesParams`：`{ ids: string[] }`（与 `DeleteEpisodesParams` 形状一致）。
- 与 `deleteCreations`（`v1/episodes`）保持相同的调用风格（`api.n` / DELETE + json body）。

### `deleteCreations` 文档更新

- 在方法/类型注释中说明：传入的 id 若为 AI 视频的 episodeId，删除会一并软删其视频生成任务并对进行中任务回滚积分。
- 若 SDK 有公开 API 文档（`docs/client.md` 等），同步补充图片批量删除与视频删除说明。

### 版本

- 按 SDK 既有发布约定 bump 版本号（新增公开方法属 minor）。
- 注意 issue #120 备注：SDK 0.0.10 尚未发布、CLI/Raycast 依赖其发布——本次发布需与既有未发布变更协调，避免冲突（实现/发布阶段确认）。

## 验收标准

- [ ] 新增 `deleteAIImages({ ids })`，对接 `DELETE /v1/images`，类型与 `deleteCreations` 风格一致。
- [ ] `deleteCreations` 文档/注释标注已覆盖视频删除语义。
- [ ] 版本号与 changelog 更新；与未发布的 0.0.10 变更协调。
- [ ] 不引入对旧 `DELETE /v1/video-generation/episodes/:episodeId` 的依赖（SDK 走统一 episodes 接口）。

## 范围外

- 语音克隆。
- 文件（GCS/CDN）清理。
- 视频删除专用方法（统一由 `deleteCreations` 承担，不另开 `deleteVideoGeneration`）。
