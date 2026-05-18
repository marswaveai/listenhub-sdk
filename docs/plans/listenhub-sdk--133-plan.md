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

### Step 2: 修改 HTTP Client — 双模式认证 + envelope unwrap 兼容

**⚠️ 关键问题：`afterResponse` hook 的 envelope unwrap 对非包装 JSON 响应会误报错误。**

Server 端大部分 OpenAPI 接口使用 `ctx.setSuccessRes(data)` 返回 `{ code: 0, message: "Success", data: {...} }` 包装格式。但 **image 接口** (`POST /v1/images/generation`) 直接代理上游 provider 原始 JSON 到 `ctx.body`（如 `{ candidates: [...] }` 或 `{ data: [...] }`），不走 ListenHub envelope。

当前 SDK 的 `afterResponse` hook 对所有 `application/json` 响应执行 `body.code !== 0` 检查。对于无 `code` 字段的原始 JSON，`undefined !== 0` 为 true → 错误地抛出 `ListenHubError`。

**修复方案**: 仅当 JSON body 明确包含数字类型 `code` 字段时才执行 envelope unwrap；否则原样透传：

```typescript
// Hook 1: {code, data} unwrap (ok responses only)
async (_request, _options, response) => {
  if (!response.ok) return;
  if (response.status === 204) return;
  if (!response.headers.get('content-type')?.includes('application/json')) return;

  const body = await response.clone().json();

  // Only unwrap if response follows ListenHub envelope format
  if (typeof body.code !== 'number') return; // raw JSON — pass through unchanged

  if (body.code !== 0) {
    throw new ListenHubError({
      status: response.status,
      code: String(body.code),
      message: body.message ?? `Error ${body.code}`,
      requestId: body.request_id,
    });
  }

  return new Response(JSON.stringify(body.data), {
    status: response.status,
    headers: response.headers,
  });
},
```

这个改动对现有内部 API 无影响（所有内部接口都有 `code` 字段），同时让 image 等直接代理 provider 响应的接口能正常工作。

---

### Step 2b: 修改 HTTP Client 支持双模式认证

**文件**: `src/client.ts`

改动点：

1. 新增 `DEFAULT_OPENAPI_BASE_URL` 常量：`https://api.listenhub.ai/openapi`
2. 在 `createHttpClient` 函数入口**一次性解析** `effectiveApiKey`，后续 baseURL 选择和 header 注入使用同一个值：
   ```typescript
   const effectiveApiKey = opts.apiKey || process.env['LISTENHUB_API_KEY'];
   ```
3. baseURL 优先级（从高到低）：
   - `opts.baseURL`（用户显式指定，尊重任何环境包括 staging/local）
   - `process.env['LISTENHUB_API_URL']`（现有行为，向后兼容）
   - 如果 `effectiveApiKey` 存在 → `DEFAULT_OPENAPI_BASE_URL`
   - 否则 → `DEFAULT_BASE_URL`（现有 `/api` 路径）
4. `beforeRequest` hook 使用闭包中已解析的 `effectiveApiKey`（不再重复读 env）：
   ```typescript
   beforeRequest: [
     async (request) => {
       if (effectiveApiKey) {
         request.headers.set('Authorization', `Bearer ${effectiveApiKey}`);
       } else {
         const token = typeof opts.accessToken === 'function' ? opts.accessToken() : opts.accessToken;
         if (token) {
           request.headers.set('Authorization', `Bearer ${token}`);
         }
       }
     },
   ],
   ```

**关键约束**: `effectiveApiKey` 和 baseURL 在同一时刻从同一来源解析，不会因后续 env 变化而漂移。一个 client 实例绑定一种认证模式。

---

### Step 3: 新增 OpenAPI 类型定义

**文件**: `src/types/openapi.ts`（新建）

按 server 端 Joi schema 对齐定义所有类型。分组：

```typescript
// --- 通用 ---
export interface OpenAPICreateEpisodeResponse { episodeId: string }
export interface OpenAPICreateTextContentResponse { episodeId: string; message: string }

// --- Flow Speech ---
export interface OpenAPICreateFlowSpeechParams { sources: Array<{ type: 'text' | 'url'; content?: string; uri?: string }>; speakers: Array<{ speakerId: string }>; language?: string; mode?: 'smart' | 'direct' }
export interface OpenAPICreateFlowSpeechTTSParams { scripts: Array<{ content: string; speakerId: string }>; title?: string }
export interface OpenAPIFlowSpeechDetail { episodeId: string; createdAt: number; processStatus: string; ... }

// --- Podcast ---
export interface OpenAPICreatePodcastParams { query?: string; sources?: Array<{ type: 'text' | 'url'; content: string }>; speakers: Array<{ speakerId: string }>; language?: string; mode?: string }
export interface OpenAPIPodcastDetail { episodeId: string; createdAt: number; processStatus: string; contentStatus?: string; ... }
export interface OpenAPIGenerateAudioParams { scripts?: Array<{ content: string; speakerId: string }> }
export interface OpenAPIGenerateAudioResponse { success: boolean; message: string; episodeId: string; status: string }

// --- TTS ---
export interface OpenAPISpeechParams { scripts: Array<{ content: string; speakerId: string }> }
export interface OpenAPISpeechResponse { audioUrl: string; audioDuration: number; subtitlesUrl?: string; taskId: string; credits: number }
export interface OpenAPITTSParams { input: string; voice: string; response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' }

// --- Storybook ---
export interface OpenAPICreateStorybookParams { sources: Array<{ type: 'text' | 'url'; content: string }>; speakers?: Array<{ speakerId: string }>; skipAudio?: boolean; style?: string; language?: string; mode?: 'info' | 'story' | 'slides' }
export interface OpenAPIStorybookDetail { episodeId: string; createdAt: number; processStatus: string; pages?: Array<{ text?: string; pageNumber?: number; imageUrl?: string; audioTimestamp?: number }>; videoUrl?: string; videoStatus?: string; ... }

// --- Image ---
export interface OpenAPICreateImageParams { provider: string; model?: string; prompt: string; referenceImages?: ...; imageConfig?: { imageSize?: string; aspectRatio?: string } }
export interface OpenAPICreateImageResponse { ... }

// --- Video Generation ---
export interface OpenAPICreateVideoGenerationParams { model?: string; content: Array<...>; resolution?: string; ratio?: string; duration?: number; generateAudio?: boolean; seed?: number; inputVideoDuration?: number }
export interface OpenAPIVideoGenerationTaskDetail { ... }
export interface OpenAPIListVideoGenerationTasksParams { page?: number; pageSize?: number; status?: string }
export interface OpenAPIListVideoGenerationTasksResponse { ... }
export interface OpenAPIEstimateVideoCreditsParams { model: string; resolution: string; duration: number; hasVideoInput?: boolean; inputVideoDuration?: number; ratio?: string }
export interface OpenAPIEstimateVideoCreditsResponse { ... }

// --- Content Extract ---
export interface OpenAPICreateContentExtractParams { source: { type: 'url'; uri: string }; options?: { summarize?: boolean; maxLength?: number; twitter?: { count?: number } } }
export interface OpenAPIContentExtractDetail { taskId: string; status: 'processing' | 'completed' | 'failed'; createdAt?: number; data?: { content?: string; metadata?: Record<string, unknown>; references?: unknown[] }; credits?: number; failCode?: number; message?: string }

// --- User ---
export interface OpenAPISubscriptionInfo { totalAvailableCredits: number; subscriptionStartedAt?: number; subscriptionExpiresAt?: number; usageAvailableMonthlyCredits?: number; usageTotalMonthlyCredits?: number; usageAvailablePermanentCredits?: number; usageTotalPermanentCredits?: number; usageAvailableLimitedTimeCredits?: number; resetAt?: number; platform?: string; renewStatus?: boolean; paidStatus?: boolean; subscriptionPlan?: { name?: string; duration?: string; platform?: string } }

// --- Speakers ---
export interface OpenAPISpeaker { name: string; speakerId: string; demoAudioUrl: string; gender: string; language: string; profile?: { pitch?: string[]; speed?: string[]; traits?: string[]; styles?: string[]; scenes?: string[]; accent?: string; description?: string; descriptionLocalized?: Record<string, string> } }
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
/** SSE text stream (script/outline). Returns raw Response for caller to consume as stream. */
async openapiGetFlowSpeechTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
  return this.api.get(`v1/flow-speech/episodes/${episodeId}/text-stream`, { searchParams: { event } });
}
/** Multi-speaker direct TTS mode — POST /v1/flow-speech/episodes/tts */
async openapiCreateFlowSpeechTTS(params: OpenAPICreateFlowSpeechTTSParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/flow-speech/episodes/tts', { json: params }).json();
}

// --- OpenAPI: Podcast ---
async openapiCreatePodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse> {
  return this.api.post('v1/podcast/episodes', { json: params }).json();
}
async openapiGetPodcast(episodeId: string): Promise<OpenAPIPodcastDetail> {
  return this.api.get(`v1/podcast/episodes/${episodeId}`).json();
}
/** SSE text stream (script/outline). Returns raw Response for caller to consume as stream. */
async openapiGetPodcastTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
  return this.api.get(`v1/podcast/episodes/${episodeId}/text-stream`, { searchParams: { event } });
}
async openapiCreatePodcastTextContent(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateTextContentResponse> {
  return this.api.post('v1/podcast/episodes/text-content', { json: params }).json();
}
async openapiGeneratePodcastAudio(episodeId: string, params?: OpenAPIGenerateAudioParams): Promise<OpenAPIGenerateAudioResponse> {
  return this.api.post(`v1/podcast/episodes/${episodeId}/audio`, { json: params ?? {} }).json();
}

// --- OpenAPI: TTS ---
async openapiSpeech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse> {
  return this.api.post('v1/speech', { json: params }).json();
}
/** OpenAI-compatible TTS — returns raw binary audio Response. */
async openapiTTS(params: OpenAPITTSParams): Promise<Response> {
  return this.api.post('v1/tts', { json: params });
}
/** Alias of openapiTTS at /v1/audio/speech (OpenAI SDK path convention). */
async openapiAudioSpeech(params: OpenAPITTSParams): Promise<Response> {
  return this.api.post('v1/audio/speech', { json: params });
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
   - `effectiveApiKey` 在构造时固化，后续 env 变更不影响已有实例

2. **baseURL 优先级**
   - 有 `apiKey` 无 `baseURL` 无 env → 请求发到 `https://api.listenhub.ai/openapi/v1/...`
   - 有 `apiKey` + 显式 `baseURL` → 用显式值（staging 场景）
   - 有 `apiKey` + `LISTENHUB_API_URL` env → env 优先于 mode default
   - 仅 `accessToken` → 保持 `/api/v1/...`

3. **OpenAPI 方法调用**
   - 每个 `openapi*` 方法发出正确的 method + path + body
   - 响应正确解析（含 `OpenAPICreateTextContentResponse` 的 `{ episodeId, message }`）
   - 流式方法（`openapiTTS`、`openapiAudioSpeech`、`openapiGetFlowSpeechTextStream`、`openapiGetPodcastTextStream`）返回 raw Response
   - `openapiCreateImage` 返回 raw provider JSON（如 `{ candidates: [...] }`）— mock 无 `code` 字段响应，验证不被 envelope unwrap 误判为错误

4. **envelope unwrap 兼容性**
   - 标准 `{ code: 0, data: {...} }` 正常 unwrap 为 data
   - 标准 `{ code: 40001, message: "..." }` 抛出 ListenHubError
   - 非 envelope JSON（无 `code` 字段或 `code` 非 number）原样透传
   - 确保现有内部 API 测试全部通过（向后兼容）

5. **错误处理**
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
Step 2 (client.ts — envelope unwrap 兼容)  ←  独立修复，可先跑现有测试验证
  ↓
Step 2b (client.ts — 双模式认证 + baseURL)  ←  依赖 Step 1
  ↓
Step 3 (types/openapi.ts)  ←  纯类型，无运行时依赖
  ↓
Step 4 (listenhub.ts)  ←  依赖 Step 2b + 3
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
| effectiveApiKey 解析 | `createHttpClient` 入口一次性解析 | 保证 baseURL 和 Authorization header 始终一致，不因运行时 env 变化而漂移 |
| baseURL 优先级 | `opts.baseURL > LISTENHUB_API_URL > mode default` | 支持 staging/local 开发，同时自动切换 production 路径 |
| 流式/二进制接口返回类型 | `Response` | text-stream 和 audio/speech 都返回原始 Response，调用方自行处理 stream/arrayBuffer |
| env fallback | `LISTENHUB_API_KEY` | 与 `LISTENHUB_API_URL` 命名对齐，开发者直觉 |

## 预计改动量

- 新增代码：~500 行（types 占大头，新增方法约 25 个）
- 修改代码：~30 行（client.ts + types/client.ts）
- 新增测试：~250 行
- 无 breaking change，minor 版本发布
