# Spec：各产品批量删除 —— SDK（listenhub-sdk 部分）

- Issue: `Part of marswaveai/listenhub-ralph#198`
- 涉及仓库：`listenhub-sdk`（本文件）、`listenhub-api-server`、`listenhub-website-fe`
- **定位：可选 / 公开 API 对齐，不在本 issue 关键路径上。** website-fe 自带 `services/client/*`、零 SDK 依赖；#198 的验收标准（前端多选 + 后端 `DELETE /v1/images` + 视频删除收敛）**不需要 SDK 任何改动**。本 PR 仅为给公开 API 消费者补齐图片批量删除能力，可与 website-fe / api-server 解耦、独立排期。
- 本仓库分支：`ralph/listenhub-sdk--198`
- PR body 含 `Part of marswaveai/listenhub-ralph#198`

## 背景与目标

> **基线（已核对 git）**：`origin/main` 当前为 **0.0.11**（含 Mureka 全量 music API；tags v0.0.10 / v0.0.11 已于 2026-06-09 发布 npm）。但本 worktree 分支 `ralph/listenhub-sdk--198` 是从陈旧的 **0.0.9** base 切出、落后 `origin/main` 5 个 commit，且**已 push**。**实现前必须先把分支更新到 `origin/main`（用 `git merge origin/main`；分支已 push，按 Ralph git 规则禁止 rebase + force-push），否则会静默回退 Mureka music API 与 0.0.10 / 0.0.11 的版本 bump。** 目标版本 **0.0.11 → 0.0.12**。下文「当前删除能力」均以 `origin/main`(0.0.11) 为准。

SDK（`src/listenhub.ts`）当前删除能力：

- `deleteCreations(params: DeleteEpisodesParams)` → `DELETE v1/episodes { ids }`（`listenhub.ts:167`，`DeleteEpisodesParams = { ids: string[] }`）——**已覆盖** podcast/TTS/storybook/slides/explainer。视频覆盖是**有条件的未来态**：**待 api-server 收敛 PR（把视频善后并入 `deleteEpisodeByIds`）上线后**，传视频 episodeId 才会软删关联视频任务 + 进行中退积分；在那之前 `DELETE /v1/episodes` 对视频 episode 只软删 Episode 行、不碰任务/积分。SDK 无需新视频方法，但视频语义的文档/注释必须 gate 在该后端 PR 之后（见下）。
- **无图片删除**方法（仅 `createAIImage` / `getAIImage` / `listAIImages`）。
- **无视频删除**方法（仅 `createVideoGeneration` / `getVideoGenerationTask` / `listVideoGenerationTasks` / `estimate...`）。

本次 SDK 侧仅两件事：
1. **视频删除**：无需新方法——`deleteCreations` 承担。**仅在 api-server 收敛 PR 上线后**补**文档/类型注释**说明视频语义（在那之前不要把「已覆盖视频」写进公开文档，避免描述尚不存在的行为）。
2. **图片批量删除**：新增 `deleteAIImages` 对接后端新接口 `DELETE /v1/images`（依赖 api-server 该接口先上线）。

## 设计（契约）

### 新增 `deleteAIImages`

```ts
async deleteAIImages(params: DeleteAIImagesParams): Promise<void> {
  await this.api.delete('v1/images', { json: params }); // 调用风格对齐 deleteCreations
}
```

- `DeleteAIImagesParams`：`{ ids: string[] }`（与 `DeleteEpisodesParams` 同形）。后端对 `ids` 强制 `.min(1).max(100)`（见 api spec）；SDK 不必客户端校验，但类型注释可注明单批上限 100。
- 与 `deleteCreations`（`v1/episodes`）保持相同调用风格（DELETE + json body）。**body 字段名用 `ids`**，与 api-server `DELETE /v1/images { ids }` 及 episodes 一致（注意：banana labs 的 `imageIds` 是另一接口，勿混）。

### `deleteCreations` 文档更新

- 方法/类型注释说明：传入 id 若为 AI 视频的 episodeId，删除会一并软删其视频生成任务并对进行中任务回滚积分；legacy（无 episodeId）视频可传任务 id。**此注释与 `DELETE /v1/images` 一样，gate 在 api-server 收敛 PR 已 merge + 部署之后再落地**——后端未上线前该语义不成立。
- 若有公开 API 文档（`docs/client.md` 等），同步补图片批量删除与视频删除说明。

### 版本与发布协调

- **先把分支更新到 `origin/main`(0.0.11)**（`git merge origin/main`，理由见开头基线注），再加 `deleteAIImages`，然后 **0.0.11 → 0.0.12**（按既有约定 patch/minor）。
- **发布流程是 tag-based**：本仓库无 CHANGELOG 文件，历史发布 = 一个裸 version-bump commit（如 `0.0.11`）+ `git tag vX.Y.Z`（已核对：`ls CHANGELOG*` 无匹配，tags v0.0.1..v0.0.11）。所以「更新 changelog」不适用——按 bump-commit + tag 的实际约定发版即可（如确需 changelog 应作为新文件单开，不在本 issue 范围）。
- **发布协调**：见 [[project_music_openapi_rollout]]——确认 npm 已发布版本与在途变更链（SDK / CLI / Raycast 依赖）状态；`deleteAIImages` 依赖后端 `DELETE /v1/images` **已 merge + 部署后**再发版。

## 验收标准

- [ ] **实现前已把分支更新到 `origin/main`(0.0.11)**（含 Mureka music API），未回退 0.0.10 / 0.0.11 的变更。
- [ ] 新增 `deleteAIImages({ ids })`，对接 `DELETE /v1/images`，类型与 `deleteCreations` 风格一致、body 字段名为 `ids`。
- [ ] **`DeleteAIImagesParams` 已从 `src/index.ts` 公开 re-export**（对齐 `DeleteEpisodesParams`，否则公开消费者 import 不到类型）。
- [ ] `deleteCreations` 视频语义文档/注释 **gate 在 api-server 收敛 PR merge + 部署之后**再落地。
- [ ] 版本 **0.0.11 → 0.0.12** 并打 tag（无 CHANGELOG，按 bump-commit + tag 约定）；与在途未发布变更协调；待后端 `DELETE /v1/images` 上线后发版。
- [ ] 不引入对旧 `DELETE /v1/video-generation/episodes/:episodeId` 的依赖（统一走 episodes 接口）。

## 范围外

- 语音克隆。
- 文件（GCS/CDN）清理。
- 视频删除专用方法（统一由 `deleteCreations` 承担，不另开 `deleteVideoGeneration`）。
