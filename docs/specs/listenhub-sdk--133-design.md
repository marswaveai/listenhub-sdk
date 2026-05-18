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

### 核心架构：双 Client 实例，完全隔离

平台登录调用（accessToken → `/api`）和 OpenAPI Key 调用（apiKey → `/openapi`）是两种完全独立的模式。SDK 通过独立的 `OpenAPIClient` 类实现隔离，两者互不影响：

```typescript
import { ListenHubClient, OpenAPIClient } from '@marswave/listenhub-sdk';

// 平台登录调用（现有方式，不变）
const client = new ListenHubClient({ accessToken: 'eyJ...' });
client.createPodcast(...);

// OpenAPI Key 调用（新增，独立 client）
const openapi = new OpenAPIClient({ apiKey: 'lh_sk_xxx_yyy' });
openapi.createFlowSpeech(...);
openapi.listSpeakers();
```

#### 1. 新增 OpenAPIClientOptions

```typescript
export interface OpenAPIClientOptions {
  /** OpenAPI Key（format: lh_sk_<keyId>_<secret>）。未传入时从 LISTENHUB_API_KEY 环境变量读取。 */
  apiKey?: string;
  /** 基础 URL，默认 https://api.marswave.ai/openapi */
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}
```

**现有 `ClientOptions` 不变**，不新增 `apiKey` 字段，保持 `ListenHubClient` 纯粹面向平台登录场景。

#### 2. OpenAPIClient 认证

`OpenAPIClient` 内部创建独立的 HTTP client 实例，固定 baseURL 为 `https://api.marswave.ai/openapi`：

```typescript
const effectiveApiKey = opts.apiKey || process.env['LISTENHUB_API_KEY'];

if (!effectiveApiKey) {
  throw new Error('OpenAPIClient requires an apiKey (or set LISTENHUB_API_KEY env var)');
}

// beforeRequest hook:
beforeRequest: [
  async (request) => {
    request.headers.set('Authorization', `Bearer ${effectiveApiKey}`);
  },
],
```

**与 ListenHubClient 的关键区别：**
- `ListenHubClient` 走 `/api` + accessToken（现有行为零改动）
- `OpenAPIClient` 走 `/openapi` + apiKey（新增，独立类）
- 两者可同时实例化，互不影响
- `LISTENHUB_API_KEY` 环境变量只影响 `OpenAPIClient`

#### 3. OpenAPIClient 方法

`OpenAPIClient` 只暴露 OpenAPI 端可用的方法，命名不带 `openapi` 前缀（因为类本身已表明语境）：

```typescript
class OpenAPIClient {
  // --- Speakers ---
  async listSpeakers(params?: ListSpeakersParams): Promise<ListSpeakersResponse>

  // --- Flow Speech ---
  async createFlowSpeech(params: CreateFlowSpeechParams): Promise<CreateEpisodeResponse>
  async getFlowSpeech(episodeId: string): Promise<FlowSpeechDetail>
  async getFlowSpeechTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response>
  async createFlowSpeechTTS(params: CreateFlowSpeechTTSParams): Promise<CreateEpisodeResponse>

  // --- Podcast ---
  async createPodcast(params: CreatePodcastParams): Promise<CreateEpisodeResponse>
  async getPodcast(episodeId: string): Promise<PodcastDetail>
  async getPodcastTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response>
  async createPodcastTextContent(params: CreatePodcastParams): Promise<CreateTextContentResponse>
  async generatePodcastAudio(episodeId: string, params?: GenerateAudioParams): Promise<GenerateAudioResponse>

  // --- TTS ---
  async speech(params: SpeechParams): Promise<SpeechResponse>
  async tts(params: TTSParams): Promise<Response>
  async audioSpeech(params: TTSParams): Promise<Response>

  // --- Storybook ---
  async createStorybook(params: CreateStorybookParams): Promise<CreateEpisodeResponse>
  async getStorybook(episodeId: string): Promise<StorybookDetail>
  async generateStorybookVideo(episodeId: string): Promise<{ success: boolean }>

  // --- Image ---
  async createImage(params: CreateImageParams): Promise<CreateImageResponse>

  // --- Video Generation ---
  async createVideoGeneration(params: CreateVideoGenerationParams): Promise<CreateVideoGenerationResponse>
  async getVideoGenerationTask(taskId: string): Promise<VideoGenerationTaskDetail>
  async listVideoGenerationTasks(params?: ListVideoGenerationTasksParams): Promise<ListVideoGenerationTasksResponse>
  async estimateVideoCredits(params: EstimateVideoCreditsParams): Promise<EstimateVideoCreditsResponse>

  // --- Content Extract ---
  async createContentExtract(params: CreateContentExtractParams): Promise<{ taskId: string }>
  async getContentExtract(taskId: string): Promise<ContentExtractDetail>

  // --- User ---
  async getSubscription(): Promise<SubscriptionInfo>
}
```

#### 4. 类型定义

在 `src/types/openapi.ts` 中定义所有 OpenAPI 接口的参数和响应类型。类型命名不带 `OpenAPI` 前缀，而是通过模块导入路径区分：

```typescript
import type { CreateFlowSpeechParams, FlowSpeechDetail } from '@marswave/listenhub-sdk/types/openapi';
```

#### 5. 环境变量

| 变量 | 用途 | 影响范围 |
|------|------|---------|
| `LISTENHUB_API_KEY` | OpenAPI Key fallback | 仅 `OpenAPIClient` |
| `LISTENHUB_API_URL` | 自定义 base URL | 仅 `ListenHubClient`（现有行为） |
| `LISTENHUB_OPENAPI_URL` | 自定义 OpenAPI base URL | 仅 `OpenAPIClient` |

#### 6. Envelope unwrap 兼容

`OpenAPIClient` 的 HTTP client 需要处理两种响应格式：
- 标准 envelope `{ code: 0, data: {...} }` — unwrap 为 data
- 原始 JSON（如 image 接口代理 provider 响应）— 原样透传

判断逻辑：仅当 JSON body 包含数字类型 `code` 字段时执行 envelope unwrap。

### 文件变更清单

| 文件 | 改动 |
|------|------|
| `src/types/openapi.ts` | **新增** — 所有 OpenAPI 类型定义 |
| `src/openapi-client.ts` | **新增** — `OpenAPIClient` 类实现 |
| `src/index.ts` | 导出 `OpenAPIClient` + 新类型 |
| `tests/unit/openapi-client.test.ts` | **新增** — OpenAPIClient 单元测试 |

**不改动**：`src/client.ts`、`src/listenhub.ts`、`src/types/client.ts`（ListenHubClient 完全不受影响）

### 不在本期范围

- API Key 管理（生成/删除/列表）— 这是 admin 接口，不暴露给 SDK 用户
- Webhook / SSE 实时推送订阅
- 多 Key 轮换或自动续签

## 兼容性

- **完全向后兼容**：`ListenHubClient` 零改动，现有代码无需任何修改
- **零 breaking change**：纯增量新增 `OpenAPIClient` 导出
- **npm semver**：minor 版本发布

## 验收标准

1. `new OpenAPIClient({ apiKey: 'lh_sk_...' })` 能正确设置 Authorization header 并请求 `https://api.marswave.ai/openapi` 前缀路由
2. `new ListenHubClient({ accessToken })` 行为完全不变，不受 `LISTENHUB_API_KEY` 环境变量影响
3. 所有 `OpenAPIClient` 方法能正确调用对应的 server 端 OpenAPI 接口
4. 429 响应自动重试机制生效
5. 认证失败（无效 key、过期 key）正确抛出 `ListenHubError`
6. 环境变量 `LISTENHUB_API_KEY` 作为 `OpenAPIClient` 的 fallback 生效
7. 单元测试覆盖认证逻辑和接口调用
8. TypeScript 类型完整导出，IDE 补全可用
