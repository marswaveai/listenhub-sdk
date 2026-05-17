# SDK 支持 SeeDance2.0 视频生成 — 设计文档

> Issue: marswaveai/listenhub-ralph#126
> 关联: marswaveai/listenhub-ralph#67（API server 实现）

## 概述

为 `@marswave/listenhub-sdk` 新增视频生成（SeeDance2.0）模块，覆盖 API server 已上线的 4 个端点，让 SDK 消费者可以创建视频生成任务、查询任务状态/列表、以及预估积分消耗。

## 接口契约（来自 API server main）

| 端点                                    | 方法 | 用途               |
| --------------------------------------- | ---- | ------------------ |
| `/v1/video-generation/generate`         | POST | 创建视频生成任务   |
| `/v1/video-generation/tasks`            | GET  | 列出用户的视频任务 |
| `/v1/video-generation/tasks/:taskId`    | GET  | 获取单个任务详情   |
| `/v1/video-generation/estimate-credits` | POST | 预估积分消耗       |

## 新增文件

### `src/types/video-generation.ts`

```typescript
// --- 枚举/联合类型 ---

export type VideoGenerationModel = 'doubao-seedance-2-pro' | 'doubao-seedance-2-fast';

export type VideoGenerationResolution = '480p' | '720p' | '1080p';

export type VideoGenerationRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';

export type VideoGenerationTaskStatus =
	| 'pending'
	| 'generating'
	| 'uploading'
	| 'success'
	| 'failed';

export type VideoContentRole =
	| 'first_frame'
	| 'last_frame'
	| 'reference_image'
	| 'reference_video'
	| 'reference_audio';

// --- Content 条目（discriminated union） ---

export interface VideoContentText {
	type: 'text';
	text: string;
}

export interface VideoContentImageUrl {
	type: 'image_url';
	image_url: {url: string};
	role: 'first_frame' | 'last_frame' | 'reference_image';
}

export interface VideoContentVideoUrl {
	type: 'video_url';
	video_url: {url: string};
	role: 'reference_video';
}

export interface VideoContentAudioUrl {
	type: 'audio_url';
	audio_url: {url: string};
	role: 'reference_audio';
}

export type VideoContentItem =
	| VideoContentText
	| VideoContentImageUrl
	| VideoContentVideoUrl
	| VideoContentAudioUrl;

// --- 请求参数 ---

export interface CreateVideoGenerationParams {
	model?: VideoGenerationModel;
	content: VideoContentItem[];
	resolution?: VideoGenerationResolution;
	ratio?: VideoGenerationRatio;
	duration?: number; // 4-15, 默认 5
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number; // 有 video_url 时必填，2-15
}

export interface ListVideoGenerationTasksParams {
	page?: number;
	pageSize?: number;
	status?: VideoGenerationTaskStatus;
}

export interface EstimateVideoGenerationCreditsParams {
	model: VideoGenerationModel;
	resolution: VideoGenerationResolution;
	duration: number;
	hasVideoInput?: boolean;
	inputVideoDuration?: number;
	ratio?: VideoGenerationRatio;
}

// --- 响应类型 ---

export interface CreateVideoGenerationResponse {
	taskId: string;
	status: VideoGenerationTaskStatus;
}

export interface VideoGenerationTaskDetail {
	id: string;
	status: VideoGenerationTaskStatus;
	model: string;
	params: {
		content: VideoContentItem[];
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

export interface VideoGenerationTaskListItem {
	id: string;
	status: VideoGenerationTaskStatus;
	model: string;
	params: {
		resolution: string;
		ratio: string;
		duration: number;
	};
	videoUrl?: string;
	providerVideoUrl?: string;
	seed?: number;
	creditCharged: number;
	createdAt: number;
}

export interface ListVideoGenerationTasksResponse {
	items: VideoGenerationTaskListItem[];
	page: number;
	pageSize: number;
	total: number;
}

export interface EstimateVideoGenerationCreditsResponse {
	tokens: number;
	credits: number;
}

// --- 错误码 ---

export type VideoGenerationErrorCode =
	| '32001' // TASK_NOT_FOUND
	| '32002' // NOT_ENOUGH_CREDIT
	| '32003' // PROVIDER_ERROR
	| '32004' // INVALID_PARAMS
	| '32005' // TASK_ACCESS_DENIED
	| '32006' // AUDIO_REQUIRES_VISUAL
	| '32007' // RATE_LIMITED
	| '32008'; // CONTENT_MODERATION
```

SDK 使用现有的 `ListenHubError` 类统一处理错误（`error.code` 为字符串形式的数字），同时导出 `VideoGenerationErrorCode` 类型，方便消费者做类型安全的错误码判断。

## SDK Client 方法

在 `src/listenhub.ts` 的 `ListenHubClient` 类中新增以下方法：

```typescript
// --- Video Generation ---

async createVideoGeneration(params: CreateVideoGenerationParams): Promise<CreateVideoGenerationResponse> {
  return this.api.post('v1/video-generation/generate', { json: params }).json<CreateVideoGenerationResponse>();
}

async getVideoGenerationTask(taskId: string): Promise<VideoGenerationTaskDetail> {
  return this.api.get(`v1/video-generation/tasks/${taskId}`).json<VideoGenerationTaskDetail>();
}

async listVideoGenerationTasks(params: ListVideoGenerationTasksParams = {}): Promise<ListVideoGenerationTasksResponse> {
  return this.api
    .get('v1/video-generation/tasks', {
      searchParams: params as Record<string, string | number | boolean>,
    })
    .json<ListVideoGenerationTasksResponse>();
}

async estimateVideoGenerationCredits(params: EstimateVideoGenerationCreditsParams): Promise<EstimateVideoGenerationCreditsResponse> {
  return this.api.post('v1/video-generation/estimate-credits', { json: params }).json<EstimateVideoGenerationCreditsResponse>();
}
```

## 导出

在 `src/index.ts` 中补充：

```typescript
export type {
	VideoGenerationModel,
	VideoGenerationResolution,
	VideoGenerationRatio,
	VideoGenerationTaskStatus,
	VideoGenerationErrorCode,
	VideoContentRole,
	VideoContentText,
	VideoContentImageUrl,
	VideoContentVideoUrl,
	VideoContentAudioUrl,
	VideoContentItem,
	CreateVideoGenerationParams,
	ListVideoGenerationTasksParams,
	EstimateVideoGenerationCreditsParams,
	CreateVideoGenerationResponse,
	VideoGenerationTaskDetail,
	VideoGenerationTaskListItem,
	ListVideoGenerationTasksResponse,
	EstimateVideoGenerationCreditsResponse,
} from './types/video-generation.js';
```

## 文档

在 README.md 的 "Usage" 部分新增 Video Generation 段落，内容如下：

````markdown
### Video Generation (SeeDance2.0)

```typescript
// 预估积分
const estimate = await client.estimateVideoGenerationCredits({
	model: 'doubao-seedance-2-fast',
	resolution: '720p',
	duration: 5,
});
console.log(`Estimated credits: ${estimate.credits}`);

// 创建视频生成任务
const task = await client.createVideoGeneration({
	model: 'doubao-seedance-2-fast',
	content: [
		{type: 'text', text: '一只猫在花园里奔跑'},
		{type: 'image_url', image_url: {url: 'https://example.com/cat.jpg'}, role: 'first_frame'},
	],
	resolution: '720p',
	duration: 5,
});
console.log(`Task created: ${task.taskId}`);

// 查询任务状态
const detail = await client.getVideoGenerationTask(task.taskId);
if (detail.status === 'success') {
	console.log(`Video URL: ${detail.videoUrl}`);
}

// 列出所有任务
const list = await client.listVideoGenerationTasks({page: 1, pageSize: 10});
```
````

## 测试

新增 `tests/unit/video-generation.test.ts`，与现有 `tests/unit/episodes.test.ts` 的 mock fetch 模式对齐：

- 类型正确性测试（确保类型编译通过）
- 方法存在性断言
- 请求参数构造验证（确保参数正确传递到 HTTP 层）
- 响应反序列化验证

## 验收标准

1. `pnpm build` 编译通过，无类型错误
2. `pnpm lint` 无格式问题
3. 所有新类型正确导出且可被消费者 import
4. README 示例可直接复制使用（假设有有效 token）
5. 测试通过

## 约束与注意事项

- `1080p` 仅 Pro 模型支持，Fast 模型不可用（API 会返回 400）
- `inputVideoDuration` 仅在 content 包含 `video_url` 类型时有效
- `audio_url` 必须配合至少一个 `image_url` 或 `video_url`
- 首帧/尾帧 role 和 reference role 不能混用
- SDK 不做这些业务验证，交给 API server 处理，SDK 只负责类型提示
