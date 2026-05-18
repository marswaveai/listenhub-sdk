# listenhub-sdk#133: 支持 OpenAPI Key 调用方式

## 背景

当前 `@marswave/listenhub-sdk` 仅支持通过 OAuth access token（`ClientOptions.accessToken`）进行身份认证。这要求用户先完成 OAuth 登录流程获取 token，适合交互式应用但不适合服务端集成场景。

`listenhub-api-server` 已实现完整的 OpenAPI Key 认证体系（路径前缀 `/openapi`），支持开发者通过 `lh_sk_<keyId>_<secret>` 格式的 API Key 以 `Authorization: Bearer <key>` 方式直接调用所有 OpenAPI 接口。SDK 需要对齐这一能力。

## API Server OpenAPI 认证机制调研

### 认证方式

- **Header**: `Authorization: Bearer lh_sk_<keyId>_<secret>`
- **Key 格式**: `lh_sk_` 前缀 + keyId + `_` + secret（24 字节 hex）
- **校验逻辑**: 从 header 提取 key → 按 `_` 分割得到 keyId 和 secret → 查 DB 获取 hash → bcrypt 比对 → 校验过期时间

### 路由前缀

OpenAPI 路由统一注册在 `/openapi` 前缀下（通过 config `openapiPrefix`），与内部 API 路由分离。

### 已有 OpenAPI 接口

| 模块 | 接口 | 方法 | 路径 |
|------|------|------|------|
| Auth | 生成 API Key | GET | `/v1/auth/api-key` |
| Flow Speech | 创建 episode | POST | `/v1/flow-speech/episodes` |
| Flow Speech | 查询 episode | GET | `/v1/flow-speech/episodes/:episodeId` |
| Flow Speech | 文本流 | GET | `/v1/flow-speech/episodes/:episodeId/text-stream` |
| Flow Speech | 多人TTS创建 | POST | `/v1/flow-speech/episodes/tts` |
| Podcast | 创建 episode | POST | `/v1/podcast/episodes` |
| Podcast | 查询 episode | GET | `/v1/podcast/episodes/:episodeId` |
| Podcast | 文本流 | GET | `/v1/podcast/episodes/:episodeId/text-stream` |
| Podcast | 仅文本内容 | POST | `/v1/podcast/episodes/text-content` |
| Podcast | 生成音频 | POST | `/v1/podcast/episodes/:episodeId/audio` |
| TTS | 直接合成 | POST | `/v1/speech` |
| TTS | OpenAI 格式 | POST | `/v1/tts` |
| TTS | OpenAI alias | POST | `/v1/audio/speech` |
| Storybook | 创建 episode | POST | `/v1/storybook/episodes` |
| Storybook | 查询 episode | GET | `/v1/storybook/episodes/:episodeId` |
| Storybook | 生成视频 | POST | `/v1/storybook/episodes/:episodeId/video` |
| Image | 图片生成 | POST | `/v1/images/generation` |
| Video | 视频生成 | POST | `/v1/video-generation/generate` |
| Video | 任务列表 | GET | `/v1/video-generation/tasks` |
| Video | 任务详情 | GET | `/v1/video-generation/tasks/:taskId` |
| Video | 预估积分 | POST | `/v1/video-generation/estimate-credits` |
| Content | 内容提取 | POST | `/v1/content/extract` |
| Content | 查询状态 | GET | `/v1/content/extract/:taskId` |
| User | 订阅信息 | GET | `/v1/user/subscription` |
| Speakers | 音色列表 | GET | `/v1/speakers/list` |

### 限速策略

API Key 本身携带限速字段（`rateLimitPerMinute`、`rateLimitPerHour`、`rateLimitPerDay`），此外各接口有全局限速中间件。SDK 侧需能正确处理 429 响应。

### 错误响应

API Key 认证失败返回标准 BizError 格式：
```json
{
  "code": <errno>,
  "message": "Invalid API key"
}
```

## 设计方案

### 核心改动：双模式认证 + OpenAPI 基路径

#### 1. 扩展 ClientOptions

```typescript
export interface ClientOptions {
  /** OAuth access token（现有方式，调内部 API） */
  accessToken?: string | (() => string | undefined);
  /** OpenAPI Key（新增，调 /openapi 前缀路由） */
  apiKey?: string;
  /** 基础 URL，默认 https://api.listenhub.ai/api（内部）或 https://api.listenhub.ai/openapi（OpenAPI） */
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}
```

**认证优先级**: `apiKey` > `accessToken`。两者同时提供时以 `apiKey` 为准。

**baseURL 自动切换**:
- 提供 `apiKey` 且未显式设置 `baseURL` → 默认 `https://api.listenhub.ai/openapi`
- 提供 `accessToken` 且未显式设置 `baseURL` → 默认 `https://api.listenhub.ai/api`（现有行为）
- 显式设置 `baseURL` → 使用用户提供的值

#### 2. Header 注入

在 `createHttpClient` 的 `beforeRequest` hook 中：

```typescript
beforeRequest: [
  async (request) => {
    if (opts.apiKey) {
      request.headers.set('Authorization', `Bearer ${opts.apiKey}`);
    } else {
      const token = typeof opts.accessToken === 'function'
        ? opts.accessToken()
        : opts.accessToken;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
    }
  },
],
```

#### 3. 新增 OpenAPI 专用方法

在 `ListenHubClient` 中新增覆盖 server 端所有 OpenAPI 接口的方法（与现有内部 API 方法并存）：

```typescript
// --- OpenAPI: Flow Speech ---
async openapiCreateFlowSpeech(params: OpenAPICreateFlowSpeechParams): Promise<OpenAPICreateEpisodeResponse>
async openapiGetFlowSpeech(episodeId: string): Promise<OpenAPIFlowSpeechDetail>

// --- OpenAPI: Podcast ---
async openapiCreatePodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse>
async openapiGetPodcast(episodeId: string): Promise<OpenAPIPodcastDetail>
async openapiCreatePodcastTextContent(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse>
async openapiGeneratePodcastAudio(episodeId: string, params?: OpenAPIGenerateAudioParams): Promise<OpenAPIGenerateAudioResponse>

// --- OpenAPI: TTS ---
async openapiSpeech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse>
async openapiTTS(params: OpenAPITTSParams): Promise<Response> // 流式二进制

// --- OpenAPI: Storybook ---
async openapiCreateStorybook(params: OpenAPICreateStorybookParams): Promise<OpenAPICreateEpisodeResponse>
async openapiGetStorybook(episodeId: string): Promise<OpenAPIStorybookDetail>
async openapiGenerateStorybookVideo(episodeId: string): Promise<{success: boolean}>

// --- OpenAPI: Image ---
async openapiCreateImage(params: OpenAPICreateImageParams): Promise<OpenAPICreateImageResponse>

// --- OpenAPI: Video Generation ---
async openapiCreateVideoGeneration(params: OpenAPICreateVideoGenerationParams): Promise<OpenAPICreateVideoGenerationResponse>
async openapiGetVideoGenerationTask(taskId: string): Promise<OpenAPIVideoGenerationTaskDetail>
async openapiListVideoGenerationTasks(params?: OpenAPIListVideoGenerationTasksParams): Promise<OpenAPIListVideoGenerationTasksResponse>
async openapiEstimateVideoCredits(params: OpenAPIEstimateVideoCreditsParams): Promise<OpenAPIEstimateVideoCreditsResponse>

// --- OpenAPI: Content ---
async openapiCreateContentExtract(params: OpenAPICreateContentExtractParams): Promise<{taskId: string}>
async openapiGetContentExtract(taskId: string): Promise<OpenAPIContentExtractDetail>

// --- OpenAPI: User ---
async openapiGetSubscription(): Promise<OpenAPISubscriptionInfo>

// --- OpenAPI: Speakers ---
async openapiListSpeakers(params?: OpenAPIListSpeakersParams): Promise<OpenAPIListSpeakersResponse>
```

#### 4. 类型定义

在 `src/types/` 下新增 `openapi.ts`，定义所有 OpenAPI 接口的参数和响应类型。类型命名以 `OpenAPI` 前缀区分。

#### 5. 便捷工厂函数

提供快捷创建方式：

```typescript
import { ListenHubClient } from '@marswave/listenhub-sdk';

// OpenAPI Key 模式（推荐给外部开发者）
const client = new ListenHubClient({ apiKey: 'lh_sk_xxx_yyy' });

// 现有 OAuth 模式（不变）
const client = new ListenHubClient({ accessToken: 'eyJ...' });
```

#### 6. 环境变量支持

```typescript
const DEFAULT_API_KEY = process.env['LISTENHUB_API_KEY'];
const DEFAULT_BASE_URL = process.env['LISTENHUB_API_URL'] || ...;
```

如果未传入 `apiKey` 参数，自动从 `LISTENHUB_API_KEY` 环境变量读取。

### 文件变更清单

| 文件 | 改动 |
|------|------|
| `src/types/client.ts` | 新增 `apiKey` 字段 |
| `src/types/openapi.ts` | **新增** — 所有 OpenAPI 类型定义 |
| `src/client.ts` | 认证逻辑支持双模式 + baseURL 自动切换 |
| `src/listenhub.ts` | 新增 `openapi*` 系列方法 |
| `src/index.ts` | 导出新类型 |
| `tests/unit/client.test.ts` | 新增 apiKey 认证测试 |
| `tests/unit/openapi.test.ts` | **新增** — OpenAPI 方法单元测试 |

### 不在本期范围

- API Key 管理（生成/删除/列表）— 这是 admin 接口，不暴露给 SDK 用户
- Webhook / SSE 实时推送订阅
- 多 Key 轮换或自动续签

## 兼容性

- **完全向后兼容**：现有 `accessToken` 方式不受影响
- **零 breaking change**：`ClientOptions` 只新增可选字段
- **npm semver**：可作为 minor 版本发布（0.0.7 或 0.1.0）

## 验收标准

1. `new ListenHubClient({ apiKey: 'lh_sk_...' })` 能正确设置 Authorization header 并请求 `/openapi` 前缀路由
2. 所有 `openapi*` 方法能正确调用对应的 server 端 OpenAPI 接口
3. 429 响应自动重试机制在 OpenAPI 模式下同样生效
4. 认证失败（无效 key、过期 key）能正确抛出 `ListenHubError`
5. 环境变量 `LISTENHUB_API_KEY` 自动生效
6. 单元测试覆盖认证逻辑和接口调用
7. TypeScript 类型完整导出，IDE 补全可用
