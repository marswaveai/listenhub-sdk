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

| 模块        | 接口         | 方法 | 路径                                              |
| ----------- | ------------ | ---- | ------------------------------------------------- |
| Auth        | 生成 API Key | GET  | `/v1/auth/api-key`                                |
| Flow Speech | 创建 episode | POST | `/v1/flow-speech/episodes`                        |
| Flow Speech | 查询 episode | GET  | `/v1/flow-speech/episodes/:episodeId`             |
| Flow Speech | 文本流       | GET  | `/v1/flow-speech/episodes/:episodeId/text-stream` |
| Flow Speech | 多人TTS创建  | POST | `/v1/flow-speech/episodes/tts`                    |
| Podcast     | 创建 episode | POST | `/v1/podcast/episodes`                            |
| Podcast     | 查询 episode | GET  | `/v1/podcast/episodes/:episodeId`                 |
| Podcast     | 文本流       | GET  | `/v1/podcast/episodes/:episodeId/text-stream`     |
| Podcast     | 仅文本内容   | POST | `/v1/podcast/episodes/text-content`               |
| Podcast     | 生成音频     | POST | `/v1/podcast/episodes/:episodeId/audio`           |
| TTS         | 直接合成     | POST | `/v1/speech`                                      |
| TTS         | OpenAI 格式  | POST | `/v1/tts`                                         |
| TTS         | OpenAI alias | POST | `/v1/audio/speech`                                |
| Storybook   | 创建 episode | POST | `/v1/storybook/episodes`                          |
| Storybook   | 查询 episode | GET  | `/v1/storybook/episodes/:episodeId`               |
| Storybook   | 生成视频     | POST | `/v1/storybook/episodes/:episodeId/video`         |
| Image       | 图片生成     | POST | `/v1/images/generation`                           |
| Video       | 视频生成     | POST | `/v1/video-generation/generate`                   |
| Video       | 任务列表     | GET  | `/v1/video-generation/tasks`                      |
| Video       | 任务详情     | GET  | `/v1/video-generation/tasks/:taskId`              |
| Video       | 预估积分     | POST | `/v1/video-generation/estimate-credits`           |
| Content     | 内容提取     | POST | `/v1/content/extract`                             |
| Content     | 查询状态     | GET  | `/v1/content/extract/:taskId`                     |
| User        | 订阅信息     | GET  | `/v1/user/subscription`                           |
| Speakers    | 音色列表     | GET  | `/v1/speakers/list`                               |

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
	async listSpeakers(params?: OpenAPIListSpeakersParams): Promise<OpenAPIListSpeakersResponse>;

	// --- Flow Speech ---
	async createFlowSpeech(
		params: OpenAPICreateFlowSpeechParams,
	): Promise<OpenAPICreateEpisodeResponse>;
	async getFlowSpeech(episodeId: string): Promise<OpenAPIFlowSpeechDetail>;
	async getFlowSpeechTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response>;
	async createFlowSpeechTTS(
		params: OpenAPICreateFlowSpeechTTSParams,
	): Promise<OpenAPICreateEpisodeResponse>;

	// --- Podcast ---
	async createPodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse>;
	async getPodcast(episodeId: string): Promise<OpenAPIPodcastDetail>;
	async getPodcastTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response>;
	async createPodcastTextContent(
		params: OpenAPICreatePodcastParams,
	): Promise<OpenAPICreateTextContentResponse>;
	async generatePodcastAudio(
		episodeId: string,
		params?: OpenAPIGenerateAudioParams,
	): Promise<OpenAPIGenerateAudioResponse>;

	// --- TTS ---
	async speech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse>;
	async tts(params: OpenAPITTSParams): Promise<Response>;
	async audioSpeech(params: OpenAPITTSParams): Promise<Response>;

	// --- Storybook ---
	async createStorybook(
		params: OpenAPICreateStorybookParams,
	): Promise<OpenAPICreateEpisodeResponse>;
	async getStorybook(episodeId: string): Promise<OpenAPIStorybookDetail>;
	async generateStorybookVideo(episodeId: string): Promise<{success: boolean}>;

	// --- Image ---
	async createImage(params: OpenAPICreateImageParams): Promise<OpenAPICreateImageResponse>;

	// --- Video Generation ---
	async createVideoGeneration(
		params: OpenAPICreateVideoGenerationParams,
	): Promise<OpenAPICreateVideoGenerationResponse>;
	async getVideoGenerationTask(taskId: string): Promise<OpenAPIVideoGenerationTaskDetail>;
	async listVideoGenerationTasks(
		params?: OpenAPIListVideoGenerationTasksParams,
	): Promise<OpenAPIListVideoGenerationTasksResponse>;
	async estimateVideoCredits(
		params: OpenAPIEstimateVideoCreditsParams,
	): Promise<OpenAPIEstimateVideoCreditsResponse>;

	// --- Content Extract ---
	async createContentExtract(params: OpenAPICreateContentExtractParams): Promise<{taskId: string}>;
	async getContentExtract(taskId: string): Promise<OpenAPIContentExtractDetail>;

	// --- User ---
	async getSubscription(): Promise<OpenAPISubscriptionInfo>;
}
```

#### 4. 类型定义与导出策略

在 `src/types/openapi.ts` 中定义所有 OpenAPI 接口的参数和响应类型。**类型统一保留 `OpenAPI` 前缀**，避免和现有 root 导出的同名类型冲突（如 `CreateEpisodeResponse`、`Speaker`、`VideoGenerationTaskStatus` 等已存在于 root）。

从 root `src/index.ts` 具名导出所有 OpenAPI 类型，**不新增 subpath exports**（`package.json` 维持单一 `"exports": "./dist/index.mjs"` 不变）：

```typescript
// src/index.ts 新增：
export {OpenAPIClient} from './openapi-client.js';
export type {OpenAPIClientOptions} from './types/openapi.js';
export type {
	OpenAPICreateEpisodeResponse,
	OpenAPICreateFlowSpeechParams,
	OpenAPIFlowSpeechDetail,
	// ... 所有 OpenAPI* 类型
} from './types/openapi.js';
```

消费者用法：

```typescript
import {OpenAPIClient, type OpenAPICreateFlowSpeechParams} from '@marswave/listenhub-sdk';
```

#### 5. 环境变量

| 变量                    | 用途                    | 影响范围                         |
| ----------------------- | ----------------------- | -------------------------------- |
| `LISTENHUB_API_KEY`     | OpenAPI Key fallback    | 仅 `OpenAPIClient`               |
| `LISTENHUB_API_URL`     | 自定义 base URL         | 仅 `ListenHubClient`（现有行为） |
| `LISTENHUB_OPENAPI_URL` | 自定义 OpenAPI base URL | 仅 `OpenAPIClient`               |

#### 6. Envelope unwrap + 错误归一化

`OpenAPIClient` 的 HTTP client 复用现有 `parseErrorResponse` 函数，完整处理所有错误场景：

**afterResponse hooks（按顺序执行）：**

1. **Hook 1 — envelope unwrap（仅 ok 响应）**：
   - 仅当 JSON body 包含数字类型 `code` 字段时执行 envelope unwrap
   - `code === 0` → unwrap `data` 字段
   - `code !== 0` → 抛出 `ListenHubError`
   - 无 `code` 字段（如 image 接口 raw JSON）→ 原样透传

2. **Hook 2 — 非 2xx 错误归一化（跳过 429 让 ky retry）**：
   - `response.ok` → 跳过
   - `status === 429` → 跳过（留给 ky retry 机制处理）
   - 其他非 2xx → 调用 `parseErrorResponse` 转为 `ListenHubError` 抛出

**beforeError hook（429 重试耗尽）：**

- 捕获 ky `HTTPError`（重试耗尽后的最终错误）
- 调用 `parseErrorResponse` 将响应体解析为 `ListenHubError`

**retry 配置：**

- `statusCodes: [429]`
- `shouldRetry`: 如果 error 是 `ListenHubError` 且 status 429 → 允许重试；其他 `ListenHubError` → 不重试

这保证所有错误（401 无效 key、403 过期 key、429 限速、500 服务端错误、HTML 网关错误）统一抛出 `ListenHubError`，与现有 `ListenHubClient` 行为一致。

### 文件变更清单

| 文件                                | 改动                              |
| ----------------------------------- | --------------------------------- |
| `src/types/openapi.ts`              | **新增** — 所有 OpenAPI 类型定义  |
| `src/openapi-client.ts`             | **新增** — `OpenAPIClient` 类实现 |
| `src/index.ts`                      | 导出 `OpenAPIClient` + 新类型     |
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
