# listenhub-sdk#133: 实现计划 — 支持 OpenAPI Key 调用方式

## 实现步骤

### Step 1: 扩展 ClientOptions 类型

**文件**: `src/types/client.ts`

新增 `apiKey` 可选字段：

```typescript
export interface ClientOptions {
  baseURL?: string;
  accessToken?: string | (() => string | undefined);
  /** OpenAPI Key (format: lh_sk_<keyId>_<secret>). Auto-switches baseURL to /openapi endpoint. */
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}
```

---

### Step 2: 修改 HTTP Client 支持双模式认证

**文件**: `src/client.ts`

改动点：

1. 新增 `DEFAULT_OPENAPI_BASE_URL` 常量：`https://api.listenhub.ai/openapi`
2. 读取环境变量 `LISTENHUB_API_KEY` 作为 fallback
3. `createHttpClient` 中根据认证方式自动确定 baseURL：
   - 有 `apiKey`（含 env fallback）且无显式 `baseURL` → 用 openapi 基址
   - 否则保持现有逻辑
4. `beforeRequest` hook 中优先使用 `apiKey`：
   ```typescript
   const effectiveApiKey = opts.apiKey || process.env['LISTENHUB_API_KEY'];
   if (effectiveApiKey) {
     request.headers.set('Authorization', `Bearer ${effectiveApiKey}`);
   } else {
     // 现有 accessToken 逻辑
   }
   ```

---

### Step 3: 新增 OpenAPI 类型定义

**文件**: `src/types/openapi.ts`（新建）

按 server 端 Joi schema 对齐定义所有类型。分组：

```typescript
// --- 通用 ---
export interface OpenAPICreateEpisodeResponse { episodeId: string }

// --- Flow Speech ---
export interface OpenAPICreateFlowSpeechParams { ... }
export interface OpenAPIFlowSpeechDetail { ... }

// --- Podcast ---
export interface OpenAPICreatePodcastParams { ... }
export interface OpenAPIPodcastDetail { ... }
export interface OpenAPIGenerateAudioParams { scripts?: Array<{ content: string; speakerId: string }> }
export interface OpenAPIGenerateAudioResponse { success: boolean; message: string; episodeId: string; status: string }

// --- TTS ---
export interface OpenAPISpeechParams { scripts: Array<{ content: string; speakerId: string }> }
export interface OpenAPISpeechResponse { audioUrl: string; audioDuration: number; subtitlesUrl?: string; taskId: string; credits: number }
export interface OpenAPITTSParams { input: string; voice: string; response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' }

// --- Storybook ---
export interface OpenAPICreateStorybookParams { ... }
export interface OpenAPIStorybookDetail { ... }

// --- Image ---
export interface OpenAPICreateImageParams { provider: string; model?: string; prompt: string; referenceImages?: ...; imageConfig?: ... }
export interface OpenAPICreateImageResponse { ... }

// --- Video Generation ---
export interface OpenAPICreateVideoGenerationParams { ... }
export interface OpenAPIVideoGenerationTaskDetail { ... }
export interface OpenAPIListVideoGenerationTasksParams { page?: number; pageSize?: number; status?: string }
export interface OpenAPIListVideoGenerationTasksResponse { ... }
export interface OpenAPIEstimateVideoCreditsParams { ... }
export interface OpenAPIEstimateVideoCreditsResponse { ... }

// --- Content Extract ---
export interface OpenAPICreateContentExtractParams { source: { type: 'url'; uri: string }; options?: { summarize?: boolean; maxLength?: number } }
export interface OpenAPIContentExtractDetail { taskId: string; status: 'processing' | 'completed' | 'failed'; data?: { content?: string; metadata?: Record<string, unknown>; references?: unknown[] }; credits?: number }

// --- User ---
export interface OpenAPISubscriptionInfo { totalAvailableCredits: number; ... }

// --- Speakers ---
export interface OpenAPISpeaker { name: string; speakerId: string; demoAudioUrl: string; gender: string; language: string; profile?: { ... } }
export interface OpenAPIListSpeakersParams { language?: string; status?: number }
export interface OpenAPIListSpeakersResponse { items: OpenAPISpeaker[] }
```

---

### Step 4: 新增 OpenAPI 方法到 ListenHubClient

**文件**: `src/listenhub.ts`

在类末尾新增 `// --- OpenAPI ---` 区块，按模块添加方法。所有 OpenAPI 方法使用已有 `this.api` 实例（因为 baseURL 已在初始化时确定）。

路径全部以 `v1/` 开头（因为 `/openapi` 前缀已含在 baseURL 中）。

```typescript
// --- OpenAPI: Speakers ---
async openapiListSpeakers(params?: OpenAPIListSpeakersParams): Promise<OpenAPIListSpeakersResponse> {
  return this.api.get('v1/speakers/list', { searchParams: params as any }).json();
}

// --- OpenAPI: Flow Speech ---
async openapiCreateFlowSpeech(params: OpenAPICreateFlowSpeechParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/flow-speech/episodes', { json: params }).json();
}
async openapiGetFlowSpeech(episodeId: string): Promise<OpenAPIFlowSpeechDetail> {
  return this.api.get(`v1/flow-speech/episodes/${episodeId}`).json();
}

// --- OpenAPI: Podcast ---
async openapiCreatePodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/podcast/episodes', { json: params }).json();
}
async openapiGetPodcast(episodeId: string): Promise<OpenAPIPodcastDetail> {
  return this.api.get(`v1/podcast/episodes/${episodeId}`).json();
}
async openapiCreatePodcastTextContent(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/podcast/episodes/text-content', { json: params }).json();
}
async openapiGeneratePodcastAudio(episodeId: string, params?: OpenAPIGenerateAudioParams): Promise<OpenAPIGenerateAudioResponse> {
  return this.api.post(`v1/podcast/episodes/${episodeId}/audio`, { json: params ?? {} }).json();
}

// --- OpenAPI: TTS ---
async openapiSpeech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse> {
  return this.api.post('v1/speech', { json: params }).json();
}
async openapiTTS(params: OpenAPITTSParams): Promise<Response> {
  return this.api.post('v1/tts', { json: params });
}

// --- OpenAPI: Storybook ---
async openapiCreateStorybook(params: OpenAPICreateStorybookParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/storybook/episodes', { json: params }).json();
}
async openapiGetStorybook(episodeId: string): Promise<OpenAPIStorybookDetail> {
  return this.api.get(`v1/storybook/episodes/${episodeId}`).json();
}
async openapiGenerateStorybookVideo(episodeId: string): Promise<{ success: boolean }> {
  return this.api.post(`v1/storybook/episodes/${episodeId}/video`, { json: {} }).json();
}

// --- OpenAPI: Image ---
async openapiCreateImage(params: OpenAPICreateImageParams): Promise<OpenAPICreateImageResponse> {
  return this.api.post('v1/images/generation', { json: params }).json();
}

// --- OpenAPI: Video Generation ---
async openapiCreateVideoGeneration(params: OpenAPICreateVideoGenerationParams): Promise<OpenAPICreateVideoGenerationResponse> {
  return this.api.post('v1/video-generation/generate', { json: params }).json();
}
async openapiGetVideoGenerationTask(taskId: string): Promise<OpenAPIVideoGenerationTaskDetail> {
  return this.api.get(`v1/video-generation/tasks/${taskId}`).json();
}
async openapiListVideoGenerationTasks(params?: OpenAPIListVideoGenerationTasksParams): Promise<OpenAPIListVideoGenerationTasksResponse> {
  return this.api.get('v1/video-generation/tasks', { searchParams: params as any }).json();
}
async openapiEstimateVideoCredits(params: OpenAPIEstimateVideoCreditsParams): Promise<OpenAPIEstimateVideoCreditsResponse> {
  return this.api.post('v1/video-generation/estimate-credits', { json: params }).json();
}

// --- OpenAPI: Content Extract ---
async openapiCreateContentExtract(params: OpenAPICreateContentExtractParams): Promise<{ taskId: string }> {
  return this.api.post('v1/content/extract', { json: params }).json();
}
async openapiGetContentExtract(taskId: string): Promise<OpenAPIContentExtractDetail> {
  return this.api.get(`v1/content/extract/${taskId}`).json();
}

// --- OpenAPI: User ---
async openapiGetSubscription(): Promise<OpenAPISubscriptionInfo> {
  return this.api.get('v1/user/subscription').json();
}
```

---

### Step 5: 更新导出

**文件**: `src/index.ts`

新增所有 OpenAPI 类型的 `export type { ... } from './types/openapi.js'`。

---

### Step 6: 单元测试

**文件**: `tests/unit/openapi.test.ts`（新建）

测试用例：

1. **apiKey 认证**
   - 提供 `apiKey` 时 Authorization header 设置正确
   - `apiKey` 优先级高于 `accessToken`
   - 环境变量 `LISTENHUB_API_KEY` fallback 生效

2. **baseURL 自动切换**
   - 有 `apiKey` 无 `baseURL` → 请求发到 `/openapi/v1/...`
   - 有 `apiKey` + 显式 `baseURL` → 用显式值
   - 仅 `accessToken` → 保持 `/api/v1/...`

3. **OpenAPI 方法调用**
   - 每个 `openapi*` 方法发出正确的 method + path + body
   - 响应正确解析

4. **错误处理**
   - 无效 API Key 返回 ListenHubError
   - 429 重试逻辑在 apiKey 模式下同样生效

---

### Step 7: 更新现有 client.test.ts

在现有测试中补充验证：
- `apiKey` 模式不影响现有 `accessToken` 测试
- 两者都不提供时不设 Authorization header

---

## 实现顺序与依赖

```
Step 1 (types/client.ts)
  ↓
Step 2 (client.ts)  ←  无其他依赖，可独立验证
  ↓
Step 3 (types/openapi.ts)  ←  纯类型，无运行时依赖
  ↓
Step 4 (listenhub.ts)  ←  依赖 Step 2 + 3
  ↓
Step 5 (index.ts)  ←  依赖 Step 3
  ↓
Step 6-7 (tests)  ←  验证 Step 1-5
```

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| OpenAPI 方法命名 | `openapi*` 前缀 | 与现有内部 API 方法（`createPodcast` 等）区分，避免歧义 |
| baseURL 切换时机 | 构造函数内一次性决定 | 简单可靠，一个 client 实例只对应一种认证模式 |
| TTS 流式接口返回类型 | `Response` | 允许调用方自行处理 `arrayBuffer()` / `blob()` / `stream` |
| env fallback | `LISTENHUB_API_KEY` | 与 `LISTENHUB_API_URL` 命名对齐，开发者直觉 |

## 预计改动量

- 新增代码：~400 行（types 占大头）
- 修改代码：~20 行（client.ts + types/client.ts）
- 新增测试：~200 行
- 无 breaking change，minor 版本发布
