# [Bug] createSlides 请求参数与前端不一致

Issue: listenhub-sdk#45

## 问题定义

`ListenHubClient.createSlides()` 和前端 `apiCreateStorybook()` 都调用 `POST /v1/episodes/storybook`，但 SDK 发出的请求体缺少顶层 `mode` 字段。后端依赖该字段区分 slides 与 explainer video 的处理路径，缺失时走了 explainer video 逻辑，导致产出物类型错误。

### 前端请求体（正确）

```json
{
  "query": "...",
  "sources": [...],
  "mode": "slides",
  "imageConfig": {...},
  "skipAudio": true,
  "style": "...",
  "styleOverride": "...",
  "template": { "type": "storybook", "mode": "slides", ... }
}
```

### SDK 当前请求体（有 bug）

```json
{
  "skipAudio": true,
  "query": "...",
  "sources": [...],
  "imageConfig": {...},
  "template": { "type": "storybook", "mode": "slides", ... }
}
```

**差异**：缺少顶层 `mode: "slides"` 字段。

## 解决方案

在 `createSlides()` 方法中，向请求体注入顶层 `mode: 'slides'`，与 `skipAudio: true` 一同作为固定参数。

### 修改点

**1. `src/listenhub.ts:111-115` — createSlides 方法**

```typescript
// before
async createSlides(params: CreateSlidesParams): Promise<CreateEpisodeResponse> {
  return this.api
    .post('v1/episodes/storybook', {json: {skipAudio: true, ...params}})
    .json<CreateEpisodeResponse>();
}

// after
async createSlides(params: CreateSlidesParams): Promise<CreateEpisodeResponse> {
  return this.api
    .post('v1/episodes/storybook', {json: {mode: 'slides', skipAudio: true, ...params}})
    .json<CreateEpisodeResponse>();
}
```

`mode: 'slides'` 放在展开操作符之前，作为固定默认值。如果用户在 params 里传了 `mode`（理论上不会，因为类型里没这个字段），展开会覆盖。

**2. 类型无需改动**

`CreateSlidesParams` 不需要添加 `mode` 字段。`mode: 'slides'` 是该方法的固定行为，不应由调用方控制——与 `skipAudio: true` 同理。这保持了 API 的语义清晰：调用 `createSlides()` 就意味着 `mode: 'slides'`。

### 对 createExplainerVideo 的审视

`createExplainerVideo()` 同样调用 `POST /v1/episodes/storybook`，但没有发送顶层 `mode`。根据前端行为，explainer video 不需要顶层 `mode`（或者后端在缺省时默认走 explainer 路径），因此当前不需要修改。但如果后续发现 explainer video 也有类似问题，修复模式相同。

## 边界情况

| 场景 | 预期行为 |
|------|---------|
| 用户在 `params` 中传了 `skipAudio: false` | `...params` 展开覆盖前面的 `skipAudio: true`，允许用户自定义 |
| `mode` 与 `template.mode` 值不一致（理论场景） | 不会发生——`mode` 由方法硬编码为 `'slides'`，`template.mode` 类型约束为 `'slides'` |

## 测试策略

### 单元测试

在现有测试文件中（或新建 `tests/unit/create-slides.test.ts`），验证：

1. **请求体包含 `mode: 'slides'`**：mock ky，断言 POST body 中有顶层 `mode: 'slides'`
2. **`skipAudio` 默认为 true**：断言 POST body 中 `skipAudio === true`
3. **用户可覆盖 `skipAudio`**：传入 `skipAudio: false`，断言 body 中 `skipAudio === false`

### E2E 测试

如果 staging 环境可用，调用 `createSlides()` 后轮询 episode 状态，确认产出物类型为 slide deck 而非 explainer video。

## 影响范围

- 改动仅 1 行代码（`src/listenhub.ts:113`）
- 不影响 `createExplainerVideo`、CLI、类型定义
- 向后兼容：新增字段，不删除或修改已有字段
