# listenhub-sdk#133: 实现计划 — 支持 OpenAPI Key 调用方式

## 架构决策：双 Client 实例

OpenAPI Key 调用和平台登录调用是两种完全独立的模式，通过独立的 `OpenAPIClient` 类实现隔离：

```typescript
// 平台登录调用（现有 ListenHubClient，零改动）
const client = new ListenHubClient({ accessToken });
client.createPodcast(...);

// OpenAPI Key 调用（新增 OpenAPIClient，独立类）
const openapi = new OpenAPIClient({ apiKey: 'lh_sk_...' });
openapi.createFlowSpeech(...);
```

**ListenHubClient 不受影响**：不新增 `apiKey` 字段，不改变 baseURL 逻辑，`LISTENHUB_API_KEY` 环境变量对它无效。

---

## 实现步骤

### Step 1: 新增 OpenAPI 类型定义

**文件**: `src/types/openapi.ts`（新建）

所有类型统一带 `OpenAPI` 前缀，避免和现有 root 导出的同名类型冲突（如 `CreateEpisodeResponse`、`Speaker`、`VideoGenerationTaskStatus` 等已存在）。

```typescript
// --- Client Options ---
export interface OpenAPIClientOptions {
	/** OpenAPI Key (format: lh_sk_<keyId>_<secret>). Falls back to LISTENHUB_API_KEY env var. */
	apiKey?: string;
	/** Base URL, defaults to https://api.marswave.ai/openapi. Override with LISTENHUB_OPENAPI_URL env var. */
	baseURL?: string;
	timeout?: number;
	maxRetries?: number;
}

// --- 通用 ---
export interface OpenAPICreateEpisodeResponse {
	episodeId: string;
}
export interface OpenAPICreateTextContentResponse {
	episodeId: string;
	message: string;
}

// --- Flow Speech ---
export interface OpenAPICreateFlowSpeechParams {
	sources: Array<{type: 'text' | 'url'; content?: string; uri?: string}>;
	speakers: Array<{speakerId: string}>;
	language?: string;
	mode?: 'smart' | 'direct';
}
export interface OpenAPICreateFlowSpeechTTSParams {
	scripts: Array<{content: string; speakerId: string}>;
	title?: string;
}
export interface OpenAPIFlowSpeechDetail {
	episodeId: string;
	createdAt: number;
	processStatus: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	title?: string;
	outline?: string;
	cover?: string;
	audioUrl?: string;
	audioStreamUrl?: string;
	subtitlesUrl?: string;
	scripts?: string;
	sourceProcessResult?: {
		content: string;
		references?: Array<{type: string; urlCitation?: {title: string; url: string; favicon: string}}>;
	};
}

// --- Podcast ---
export interface OpenAPICreatePodcastParams {
	query?: string;
	sources?: Array<{type: 'text' | 'url'; content: string}>;
	speakers: Array<{speakerId: string}>;
	language?: string;
	mode?: string;
}
export interface OpenAPIPodcastDetail {
	episodeId: string;
	createdAt: number;
	processStatus: string;
	contentStatus?: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	credits?: number;
	title?: string;
	outline?: string;
	cover?: string;
	audioUrl?: string;
	audioStreamUrl?: string;
	subtitlesUrl?: string;
	scripts?: Array<{speakerId: string; speakerName: string; content: string}>;
	sourceProcessResult?: {
		content: string;
		references?: Array<{type: string; urlCitation?: {title: string; url: string; favicon: string}}>;
	};
}
export interface OpenAPIGenerateAudioParams {
	scripts?: Array<{content: string; speakerId: string}>;
}
export interface OpenAPIGenerateAudioResponse {
	success: boolean;
	message: string;
	episodeId: string;
	status: string;
}

// --- TTS ---
export interface OpenAPISpeechParams {
	scripts: Array<{content: string; speakerId: string}>;
}
export interface OpenAPISpeechResponse {
	audioUrl: string;
	audioDuration: number;
	subtitlesUrl?: string;
	taskId: string;
	credits: number;
}
export interface OpenAPITTSParams {
	input: string;
	voice: string;
	response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

// --- Storybook ---
export interface OpenAPICreateStorybookParams {
	sources: Array<{type: 'text' | 'url'; content: string}>;
	speakers?: Array<{speakerId: string}>;
	skipAudio?: boolean;
	style?: string;
	language?: string;
	mode?: 'info' | 'story' | 'slides';
}
export interface OpenAPIStorybookDetail {
	episodeId: string;
	createdAt: number;
	mode: string;
	processStatus: string;
	message?: string;
	failCode?: number;
	completedTime?: number;
	credits?: number;
	title?: string;
	cover?: string;
	audioUrl?: string;
	audioDuration?: number;
	videoUrl?: string;
	videoStatus?: 'not_generated' | 'pending' | 'success' | 'fail';
	pages?: Array<{text: string; pageNumber: number; imageUrl: string; audioTimestamp: number}>;
	sourceProcessResult?: {query: string; content: string; imageSources?: string[]};
}

// --- Image ---
export interface OpenAPIImageReferenceFileData {
	fileUri: string;
	mimeType: string;
}
export interface OpenAPIImageReferenceInlineData {
	data: string;
	mimeType: string;
}
export interface OpenAPICreateImageParams {
	provider: string;
	model?: string;
	prompt: string;
	referenceImages?: Array<{
		fileData?: OpenAPIImageReferenceFileData;
		inlineData?: OpenAPIImageReferenceInlineData;
	}>;
	imageConfig?: {
		imageSize?: '1K' | '2K' | '4K';
		aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
	};
}
export type OpenAPICreateImageResponse = Record<string, unknown>;

// --- Video Generation ---
export type OpenAPIVideoGenerationTaskStatus =
	| 'pending'
	| 'generating'
	| 'uploading'
	| 'success'
	| 'failed';
export interface OpenAPICreateVideoGenerationParams {
	model?: 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast';
	content: Array<
		| {type: 'text'; text: string}
		| {
				type: 'image_url';
				image_url: {url: string};
				role: 'first_frame' | 'last_frame' | 'reference_image';
		  }
		| {type: 'video_url'; video_url: {url: string}; role: 'reference_video'}
		| {type: 'audio_url'; audio_url: {url: string}; role: 'reference_audio'}
	>;
	resolution?: '480p' | '720p' | '1080p';
	ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
	duration?: number;
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number;
}
export interface OpenAPICreateVideoGenerationResponse {
	taskId: string;
	status: OpenAPIVideoGenerationTaskStatus;
}
export interface OpenAPIVideoGenerationTaskDetail {
	id: string;
	status: OpenAPIVideoGenerationTaskStatus;
	model: string;
	params: {
		content: OpenAPICreateVideoGenerationParams['content'];
		resolution: string;
		ratio: string;
		duration: number;
		generateAudio: boolean;
		seed: number;
	};
	videoUrl?: string;
	providerVideoUrl?: string;
	duration?: number;
	resolution?: string;
	ratio?: string;
	seed?: number;
	creditCharged: number;
	createdAt: number;
	updatedAt: number;
}
export interface OpenAPIListVideoGenerationTasksParams {
	page?: number;
	pageSize?: number;
	status?: OpenAPIVideoGenerationTaskStatus;
}
export interface OpenAPIListVideoGenerationTasksResponse {
	items: Array<{
		id: string;
		status: OpenAPIVideoGenerationTaskStatus;
		model: string;
		params: {resolution: string; ratio: string; duration: number};
		videoUrl?: string;
		providerVideoUrl?: string;
		seed?: number;
		creditCharged: number;
		createdAt: number;
	}>;
	page: number;
	pageSize: number;
	total: number;
}
export interface OpenAPIEstimateVideoCreditsParams {
	model: 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast';
	resolution: '480p' | '720p' | '1080p';
	duration: number;
	hasVideoInput?: boolean;
	inputVideoDuration?: number;
	ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
}
export interface OpenAPIEstimateVideoCreditsResponse {
	tokens: number;
	credits: number;
}

// --- Content Extract ---
export interface OpenAPICreateContentExtractParams {
	source: {type: 'url'; uri: string};
	options?: {summarize?: boolean; maxLength?: number; twitter?: {count?: number}};
}
export interface OpenAPIContentExtractDetail {
	taskId: string;
	status: 'processing' | 'completed' | 'failed';
	createdAt?: number;
	data?: {content?: string; metadata?: Record<string, unknown>; references?: unknown[]};
	credits?: number;
	failCode?: number;
	message?: string;
}

// --- User ---
export interface OpenAPISubscriptionInfo {
	totalAvailableCredits: number;
	subscriptionStartedAt?: number;
	subscriptionExpiresAt?: number;
	usageAvailableMonthlyCredits?: number;
	usageTotalMonthlyCredits?: number;
	usageAvailablePermanentCredits?: number;
	usageTotalPermanentCredits?: number;
	usageAvailableLimitedTimeCredits?: number;
	resetAt?: number;
	platform?: string;
	renewStatus?: boolean;
	paidStatus?: boolean;
	subscriptionPlan?: {name?: string; duration?: string; platform?: string};
}

// --- Speakers ---
export interface OpenAPISpeaker {
	name: string;
	speakerId: string;
	demoAudioUrl: string;
	gender: string;
	language: string;
	profile?: {
		pitch?: string[];
		speed?: string[];
		traits?: string[];
		styles?: string[];
		scenes?: string[];
		accent?: string;
		description?: string;
		descriptionLocalized?: Record<string, string>;
	};
}
export interface OpenAPIListSpeakersParams {
	language?: string;
	status?: number;
}
export interface OpenAPIListSpeakersResponse {
	items: OpenAPISpeaker[];
}
```

---

### Step 2: 新增 OpenAPIClient 类

**文件**: `src/openapi-client.ts`（新建）

`OpenAPIClient` 创建自己独立的 HTTP client 实例，复用现有 `parseErrorResponse` 实现完整错误归一化：

```typescript
import ky from 'ky';
import {ListenHubError} from './errors.js';
import {parseErrorResponse} from './client.js';
import type {OpenAPIClientOptions /* all OpenAPI* types */} from './types/openapi.js';

const DEFAULT_OPENAPI_BASE_URL = 'https://api.marswave.ai/openapi';

export class OpenAPIClient {
	private api: typeof ky;

	constructor(opts: OpenAPIClientOptions = {}) {
		const effectiveApiKey = opts.apiKey || process.env['LISTENHUB_API_KEY'];
		if (!effectiveApiKey) {
			throw new Error(
				'OpenAPIClient requires an apiKey option or LISTENHUB_API_KEY environment variable',
			);
		}

		const baseURL =
			opts.baseURL || process.env['LISTENHUB_OPENAPI_URL'] || DEFAULT_OPENAPI_BASE_URL;

		this.api = ky.create({
			prefixUrl: baseURL,
			timeout: opts.timeout ?? 60_000,
			retry: {
				limit: opts.maxRetries ?? 2,
				methods: ['get', 'post', 'put', 'patch', 'delete'],
				statusCodes: [429],
				shouldRetry({error}) {
					if (error instanceof ListenHubError && error.status === 429) return true;
					if (error instanceof ListenHubError) return false;
					return undefined as unknown as boolean;
				},
			},
			hooks: {
				beforeRequest: [
					async (request) => {
						request.headers.set('Authorization', `Bearer ${effectiveApiKey}`);
					},
				],
				afterResponse: [
					// Hook 1: envelope unwrap (ok responses only)
					async (_request, _options, response) => {
						if (!response.ok) return;
						if (response.status === 204) return;
						if (!response.headers.get('content-type')?.includes('application/json')) return;

						const body = await response.clone().json();

						// Only unwrap if response follows ListenHub envelope format
						if (typeof body.code !== 'number') return; // raw JSON — pass through

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

					// Hook 2: non-2xx error normalization (skip 429 for ky retry)
					async (_request, _options, response) => {
						if (response.ok || response.status === 429) return;
						throw await parseErrorResponse(response.clone());
					},
				],
				beforeError: [
					// Catches HTTPError from exhausted 429 retries
					async (error) => {
						throw await parseErrorResponse(error.response.clone());
					},
				],
			},
		});
	}

	// --- Speakers ---
	async listSpeakers(params?: OpenAPIListSpeakersParams): Promise<OpenAPIListSpeakersResponse> {
		return this.api.get('v1/speakers/list', {searchParams: params as any}).json();
	}

	// --- Flow Speech ---
	async createFlowSpeech(
		params: OpenAPICreateFlowSpeechParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/flow-speech/episodes', {json: params}).json();
	}
	async getFlowSpeech(episodeId: string): Promise<OpenAPIFlowSpeechDetail> {
		return this.api.get(`v1/flow-speech/episodes/${episodeId}`).json();
	}
	async getFlowSpeechTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
		return this.api.get(`v1/flow-speech/episodes/${episodeId}/text-stream`, {
			searchParams: {event},
		});
	}
	async createFlowSpeechTTS(
		params: OpenAPICreateFlowSpeechTTSParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/flow-speech/episodes/tts', {json: params}).json();
	}

	// --- Podcast ---
	async createPodcast(params: OpenAPICreatePodcastParams): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/podcast/episodes', {json: params}).json();
	}
	async getPodcast(episodeId: string): Promise<OpenAPIPodcastDetail> {
		return this.api.get(`v1/podcast/episodes/${episodeId}`).json();
	}
	async getPodcastTextStream(episodeId: string, event: 'script' | 'outline'): Promise<Response> {
		return this.api.get(`v1/podcast/episodes/${episodeId}/text-stream`, {searchParams: {event}});
	}
	async createPodcastTextContent(
		params: OpenAPICreatePodcastParams,
	): Promise<OpenAPICreateTextContentResponse> {
		return this.api.post('v1/podcast/episodes/text-content', {json: params}).json();
	}
	async generatePodcastAudio(
		episodeId: string,
		params?: OpenAPIGenerateAudioParams,
	): Promise<OpenAPIGenerateAudioResponse> {
		return this.api.post(`v1/podcast/episodes/${episodeId}/audio`, {json: params ?? {}}).json();
	}

	// --- TTS ---
	async speech(params: OpenAPISpeechParams): Promise<OpenAPISpeechResponse> {
		return this.api.post('v1/speech', {json: params}).json();
	}
	async tts(params: OpenAPITTSParams): Promise<Response> {
		return this.api.post('v1/tts', {json: params});
	}
	async audioSpeech(params: OpenAPITTSParams): Promise<Response> {
		return this.api.post('v1/audio/speech', {json: params});
	}

	// --- Storybook ---
	async createStorybook(
		params: OpenAPICreateStorybookParams,
	): Promise<OpenAPICreateEpisodeResponse> {
		return this.api.post('v1/storybook/episodes', {json: params}).json();
	}
	async getStorybook(episodeId: string): Promise<OpenAPIStorybookDetail> {
		return this.api.get(`v1/storybook/episodes/${episodeId}`).json();
	}
	async generateStorybookVideo(episodeId: string): Promise<{success: boolean}> {
		return this.api.post(`v1/storybook/episodes/${episodeId}/video`, {json: {}}).json();
	}

	// --- Image ---
	async createImage(params: OpenAPICreateImageParams): Promise<OpenAPICreateImageResponse> {
		return this.api.post('v1/images/generation', {json: params}).json();
	}

	// --- Video Generation ---
	async createVideoGeneration(
		params: OpenAPICreateVideoGenerationParams,
	): Promise<OpenAPICreateVideoGenerationResponse> {
		return this.api.post('v1/video-generation/generate', {json: params}).json();
	}
	async getVideoGenerationTask(taskId: string): Promise<OpenAPIVideoGenerationTaskDetail> {
		return this.api.get(`v1/video-generation/tasks/${taskId}`).json();
	}
	async listVideoGenerationTasks(
		params?: OpenAPIListVideoGenerationTasksParams,
	): Promise<OpenAPIListVideoGenerationTasksResponse> {
		return this.api.get('v1/video-generation/tasks', {searchParams: params as any}).json();
	}
	async estimateVideoCredits(
		params: OpenAPIEstimateVideoCreditsParams,
	): Promise<OpenAPIEstimateVideoCreditsResponse> {
		return this.api.post('v1/video-generation/estimate-credits', {json: params}).json();
	}

	// --- Content Extract ---
	async createContentExtract(params: OpenAPICreateContentExtractParams): Promise<{taskId: string}> {
		return this.api.post('v1/content/extract', {json: params}).json();
	}
	async getContentExtract(taskId: string): Promise<OpenAPIContentExtractDetail> {
		return this.api.get(`v1/content/extract/${taskId}`).json();
	}

	// --- User ---
	async getSubscription(): Promise<OpenAPISubscriptionInfo> {
		return this.api.get('v1/user/subscription').json();
	}
}
```

---

### Step 3: 更新导出

**文件**: `src/index.ts`

新增具名导出（不使用 `export type *`，避免和现有类型冲突）：

```typescript
export {OpenAPIClient} from './openapi-client.js';
export type {
	OpenAPIClientOptions,
	OpenAPICreateEpisodeResponse,
	OpenAPICreateTextContentResponse,
	OpenAPICreateFlowSpeechParams,
	OpenAPICreateFlowSpeechTTSParams,
	OpenAPIFlowSpeechDetail,
	OpenAPICreatePodcastParams,
	OpenAPIPodcastDetail,
	OpenAPIGenerateAudioParams,
	OpenAPIGenerateAudioResponse,
	OpenAPISpeechParams,
	OpenAPISpeechResponse,
	OpenAPITTSParams,
	OpenAPICreateStorybookParams,
	OpenAPIStorybookDetail,
	OpenAPICreateImageParams,
	OpenAPICreateImageResponse,
	OpenAPIVideoGenerationTaskStatus,
	OpenAPICreateVideoGenerationParams,
	OpenAPICreateVideoGenerationResponse,
	OpenAPIVideoGenerationTaskDetail,
	OpenAPIListVideoGenerationTasksParams,
	OpenAPIListVideoGenerationTasksResponse,
	OpenAPIEstimateVideoCreditsParams,
	OpenAPIEstimateVideoCreditsResponse,
	OpenAPICreateContentExtractParams,
	OpenAPIContentExtractDetail,
	OpenAPISubscriptionInfo,
	OpenAPISpeaker,
	OpenAPIListSpeakersParams,
	OpenAPIListSpeakersResponse,
} from './types/openapi.js';
```

**不修改 `package.json`**：保持 `"exports": "./dist/index.mjs"` 单入口不变，无需 subpath exports。

---

### Step 4: 单元测试

**文件**: `tests/unit/openapi-client.test.ts`（新建）

测试用例：

1. **构造函数验证**
   - 不传 `apiKey` 且无 `LISTENHUB_API_KEY` env → 抛 Error
   - 传 `apiKey` → 正常构造
   - 仅设 `LISTENHUB_API_KEY` env → 正常构造（fallback）
   - `effectiveApiKey` 在构造时固化，后续 env 变更不影响已有实例

2. **baseURL 优先级**
   - 无 `baseURL` 无 env → `https://api.marswave.ai/openapi/v1/...`
   - 有显式 `baseURL` → 用显式值（staging 场景）
   - 有 `LISTENHUB_OPENAPI_URL` env → env 值

3. **认证 header**
   - 所有请求自动带 `Authorization: Bearer <apiKey>`

4. **方法调用**
   - 每个方法发出正确的 method + path + body
   - 响应正确解析
   - 流式方法（`tts`、`audioSpeech`、`getFlowSpeechTextStream`、`getPodcastTextStream`）返回 raw Response
   - `createImage` 返回 raw provider JSON — mock 无 `code` 字段响应，验证不被 envelope unwrap 误判

5. **envelope unwrap 兼容性**
   - 标准 `{ code: 0, data: {...} }` 正常 unwrap 为 data
   - 标准 `{ code: 40001, message: "..." }` 抛出 ListenHubError
   - 非 envelope JSON（无 `code` 字段或 `code` 非 number）原样透传

6. **错误归一化**
   - 401（无效 API Key）→ `ListenHubError` with status 401
   - 403（过期 key）→ `ListenHubError` with status 403
   - 429 首次 → 自动重试；重试耗尽 → `ListenHubError` with status 429
   - 500（服务端错误 JSON）→ `ListenHubError` 正确解析 code/message
   - 502/503（HTML 网关错误）→ `ListenHubError` 解析 title

7. **隔离性验证**
   - `ListenHubClient` 不受 `LISTENHUB_API_KEY` env 影响
   - 两个 client 可同时实例化，互不干扰

---

## 实现顺序与依赖

```
Step 1 (types/openapi.ts)  ←  纯类型，无运行时依赖
  ↓
Step 2 (openapi-client.ts)  ←  依赖 Step 1 + 现有 parseErrorResponse
  ↓
Step 3 (index.ts)  ←  依赖 Step 2
  ↓
Step 4 (tests)  ←  验证 Step 1-3
```

## 关键设计决策

| 决策                 | 选择                                     | 理由                                                            |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| 架构模式             | 独立 `OpenAPIClient` 类                  | 两种认证是不同场景，显式分离防止模式混淆                        |
| ListenHubClient 改动 | 零改动                                   | 完全向后兼容，现有代码无需调整                                  |
| 类型命名             | 保留 `OpenAPI` 前缀                      | 从 root 导出时避免和现有同名类型冲突                            |
| 导出策略             | root 具名导出，不加 subpath              | `package.json` 不变，消费者从主入口 import                      |
| 方法命名             | 无前缀                                   | 类本身已表明语境，方法上加 `openapi` 冗余                       |
| 错误处理             | 复用 `parseErrorResponse` + 完整 hook 链 | 所有非 2xx 统一转 `ListenHubError`，与 ListenHubClient 行为一致 |
| baseURL env          | `LISTENHUB_OPENAPI_URL`                  | 独立于现有 `LISTENHUB_API_URL`                                  |
| 缺少 apiKey 行为     | 构造函数直接抛错                         | 快速失败，避免运行时 401                                        |
| 流式/二进制接口返回  | `Response`                               | text-stream 和 audio 都返回原始 Response                        |

## 文件变更清单

| 文件                                | 改动                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| `src/types/openapi.ts`              | **新增** — OpenAPIClientOptions + 所有 OpenAPI\* 类型 |
| `src/openapi-client.ts`             | **新增** — `OpenAPIClient` 类（含完整错误处理）       |
| `src/index.ts`                      | 新增具名导出 `OpenAPIClient` + 所有 OpenAPI\* 类型    |
| `tests/unit/openapi-client.test.ts` | **新增** — 完整单元测试                               |

**不改动**：`src/client.ts`、`src/listenhub.ts`、`src/types/client.ts`、`package.json`

## 预计改动量

- 新增代码：~450 行（types ~200、openapi-client ~200、index ~30）
- 修改代码：~0 行（现有代码不改）
- 新增测试：~250 行
- 无 breaking change，minor 版本发布

---

## 验证命令（PR 提交前必须全部通过）

```bash
pnpm run lint          # ESLint 检查（无 error 即通过）
pnpm run check         # TypeScript 类型检查（tsc --noEmit）
pnpm test              # Vitest 单元测试（全部通过、覆盖率不降）
```

预期结果：

- `pnpm run lint` — 0 errors, 0 warnings
- `pnpm run check` — 无输出（exit 0）
- `pnpm test` — 所有现有测试 + 新增 openapi-client 测试全部 PASS
