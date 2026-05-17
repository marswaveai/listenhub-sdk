# SeeDance2.0 Video Generation SDK Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video generation (SeeDance2.0) types, client methods, tests, and documentation to `@marswave/listenhub-sdk`.

**Architecture:** Follows the existing module pattern (music, lyrics, images): a types file exporting all request/response interfaces, client methods in `listenhub.ts` calling ky HTTP methods, re-exports from `index.ts`, and unit tests that mock fetch to verify request construction and response parsing.

**Tech Stack:** TypeScript, ky (HTTP client), vitest (testing), vite (build)

---

## File Map

| Action | Path                                  | Responsibility                                     |
| ------ | ------------------------------------- | -------------------------------------------------- |
| Create | `src/types/video-generation.ts`       | All type definitions for video generation          |
| Modify | `src/listenhub.ts`                    | Add 4 client methods                               |
| Modify | `src/index.ts`                        | Re-export all new types                            |
| Create | `tests/unit/video-generation.test.ts` | Unit tests for all 4 methods                       |
| Modify | `README.md`                           | Add Video Generation API section and usage example |

---

### Task 0: Install dependencies

**Files:** (none — environment setup)

- [ ] **Step 1: Install dependencies in the worktree**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && pnpm install --frozen-lockfile`
Expected: Dependencies installed successfully, `node_modules` populated.

---

### Task 1: Create type definitions

**Files:**

- Create: `src/types/video-generation.ts`

- [ ] **Step 1: Create the types file with all type definitions**

```typescript
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

export type VideoGenerationErrorCode =
	| '32001'
	| '32002'
	| '32003'
	| '32004'
	| '32005'
	| '32006'
	| '32007'
	| '32008';

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

export interface CreateVideoGenerationParams {
	model?: VideoGenerationModel;
	content: VideoContentItem[];
	resolution?: VideoGenerationResolution;
	ratio?: VideoGenerationRatio;
	duration?: number;
	generateAudio?: boolean;
	seed?: number;
	inputVideoDuration?: number;
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
```

- [ ] **Step 2: Verify file compiles**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && npx tsc --noEmit src/types/video-generation.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/video-generation.ts
git commit -m "feat(video-generation): add type definitions"
```

---

### Task 2: Add client methods to ListenHubClient

**Files:**

- Modify: `src/listenhub.ts` (add imports at top, methods at bottom of class)

- [ ] **Step 1: Add type imports at the top of `src/listenhub.ts`**

Add after the existing lyrics import block:

```typescript
import type {
	CreateVideoGenerationParams,
	CreateVideoGenerationResponse,
	VideoGenerationTaskDetail,
	ListVideoGenerationTasksParams,
	ListVideoGenerationTasksResponse,
	EstimateVideoGenerationCreditsParams,
	EstimateVideoGenerationCreditsResponse,
} from './types/video-generation.js';
```

- [ ] **Step 2: Add the 4 client methods at the end of the class body (before the closing `}`)**

```typescript
	// --- Video Generation ---

	async createVideoGeneration(params: CreateVideoGenerationParams): Promise<CreateVideoGenerationResponse> {
		return this.api.post('v1/video-generation/generate', {json: params}).json<CreateVideoGenerationResponse>();
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
		return this.api.post('v1/video-generation/estimate-credits', {json: params}).json<EstimateVideoGenerationCreditsResponse>();
	}
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/listenhub.ts
git commit -m "feat(video-generation): add client methods"
```

---

### Task 3: Add re-exports to index.ts

**Files:**

- Modify: `src/index.ts`

- [ ] **Step 1: Add video-generation type exports at the end of `src/index.ts`**

Append after the files.js export block:

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

- [ ] **Step 2: Verify the project compiles**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(video-generation): re-export types from index"
```

---

### Task 4: Write unit tests

**Files:**

- Create: `tests/unit/video-generation.test.ts`

- [ ] **Step 1: Write the test file**

Follow the same pattern as `tests/unit/episodes.test.ts` — mock fetch, capture requests, assert URLs/methods/bodies/responses:

```typescript
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ListenHubClient} from '../../src/listenhub';

const mockFetch = vi.fn();

beforeEach(() => vi.stubGlobal('fetch', mockFetch));
afterEach(() => vi.restoreAllMocks());

function jsonResponse(data: unknown) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status: 200,
		headers: {'content-type': 'application/json'},
	});
}

async function capturedRequest(index = 0): Promise<{url: string; method: string; body: unknown}> {
	const req: Request = mockFetch.mock.calls[index][0];
	return {
		url: req.url,
		method: req.method,
		body: (req as any)._bodyForTest,
	};
}

function mockJsonResponse(data: unknown) {
	mockFetch.mockImplementationOnce(async (req: Request) => {
		const text = await req.text();
		(req as any)._bodyForTest = text ? JSON.parse(text) : undefined;
		return jsonResponse(data);
	});
}

describe('Video Generation methods', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createVideoGeneration sends POST /v1/video-generation/generate with params', async () => {
		mockJsonResponse({taskId: 'vt-1', status: 'generating'});
		const result = await client.createVideoGeneration({
			model: 'doubao-seedance-2-fast',
			content: [
				{type: 'text', text: '一只猫在花园里奔跑'},
				{type: 'image_url', image_url: {url: 'https://example.com/cat.jpg'}, role: 'first_frame'},
			],
			resolution: '720p',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/generate');
		expect(req.method).toBe('POST');
		expect((req.body as any).model).toBe('doubao-seedance-2-fast');
		expect((req.body as any).content).toHaveLength(2);
		expect((req.body as any).content[0].type).toBe('text');
		expect((req.body as any).content[1].role).toBe('first_frame');
		expect((req.body as any).resolution).toBe('720p');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({taskId: 'vt-1', status: 'generating'});
	});

	it('getVideoGenerationTask sends GET /v1/video-generation/tasks/:taskId', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				id: 'vt-1',
				status: 'success',
				model: 'SeeDance 2.0 Fast',
				params: {
					content: [{type: 'text', text: 'test'}],
					resolution: '720p',
					ratio: '16:9',
					duration: 5,
					generateAudio: true,
					seed: 42,
				},
				videoUrl: 'https://cdn.example.com/video.mp4',
				seed: 12345,
				creditCharged: 18,
				createdAt: 1700000000000,
				updatedAt: 1700000060000,
			}),
		);
		const result = await client.getVideoGenerationTask('vt-1');
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/tasks/vt-1');
		expect(result.id).toBe('vt-1');
		expect(result.status).toBe('success');
		expect(result.videoUrl).toBe('https://cdn.example.com/video.mp4');
		expect(result.seed).toBe(12345);
		expect(result.params.content).toHaveLength(1);
	});

	it('listVideoGenerationTasks sends GET /v1/video-generation/tasks with query params', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				items: [
					{
						id: 'vt-1',
						status: 'success',
						model: 'SeeDance 2.0 Fast',
						params: {resolution: '720p', ratio: '16:9', duration: 5},
						seed: 99,
						creditCharged: 18,
						createdAt: 1700000000000,
					},
				],
				page: 1,
				pageSize: 10,
				total: 1,
			}),
		);
		const result = await client.listVideoGenerationTasks({
			page: 1,
			pageSize: 10,
			status: 'success',
		});
		const req = mockFetch.mock.calls[0][0] as Request;
		expect(req.method).toBe('GET');
		expect(req.url).toContain('v1/video-generation/tasks');
		expect(req.url).toContain('page=1');
		expect(req.url).toContain('pageSize=10');
		expect(req.url).toContain('status=success');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].seed).toBe(99);
		expect(result.total).toBe(1);
	});

	it('estimateVideoGenerationCredits sends POST /v1/video-generation/estimate-credits', async () => {
		mockJsonResponse({tokens: 6000, credits: 18});
		const result = await client.estimateVideoGenerationCredits({
			model: 'doubao-seedance-2-fast',
			resolution: '720p',
			duration: 5,
		});
		const req = await capturedRequest();
		expect(req.url).toBe('https://api.test.com/api/v1/video-generation/estimate-credits');
		expect(req.method).toBe('POST');
		expect((req.body as any).model).toBe('doubao-seedance-2-fast');
		expect((req.body as any).resolution).toBe('720p');
		expect((req.body as any).duration).toBe(5);
		expect(result).toEqual({tokens: 6000, credits: 18});
	});

	it('estimateVideoGenerationCredits with video input includes hasVideoInput and inputVideoDuration', async () => {
		mockJsonResponse({tokens: 3320, credits: 10});
		const result = await client.estimateVideoGenerationCredits({
			model: 'doubao-seedance-2-pro',
			resolution: '480p',
			duration: 5,
			hasVideoInput: true,
			inputVideoDuration: 5,
			ratio: '16:9',
		});
		const req = await capturedRequest();
		expect((req.body as any).hasVideoInput).toBe(true);
		expect((req.body as any).inputVideoDuration).toBe(5);
		expect((req.body as any).ratio).toBe('16:9');
		expect(result).toEqual({tokens: 3320, credits: 10});
	});
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && pnpm test -- tests/unit/video-generation.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unit/video-generation.test.ts
git commit -m "test(video-generation): add unit tests for all 4 client methods"
```

---

### Task 5: Update README documentation

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add Video Generation section to the API table**

Insert after the Music section (after line 101) and before the "List by product" section:

````markdown
### Video Generation (SeeDance2.0)

| Method                                   | Description                                         |
| ---------------------------------------- | --------------------------------------------------- |
| `createVideoGeneration(params)`          | Create a video generation task                      |
| `getVideoGenerationTask(taskId)`         | Get video generation task status and details        |
| `listVideoGenerationTasks(params?)`      | List video generation tasks with optional filtering |
| `estimateVideoGenerationCredits(params)` | Estimate credit cost before generating              |

**Usage example:**

```ts
// Estimate credits
const estimate = await client.estimateVideoGenerationCredits({
	model: 'doubao-seedance-2-fast',
	resolution: '720p',
	duration: 5,
});
console.log(`Estimated credits: ${estimate.credits}`);

// Create a video generation task
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

// Poll task status
const detail = await client.getVideoGenerationTask(task.taskId);
if (detail.status === 'success') {
	console.log(`Video URL: ${detail.videoUrl}`);
}

// List all tasks
const list = await client.listVideoGenerationTasks({page: 1, pageSize: 10});
```
````

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add video generation API section and usage example to README"
````

---

### Task 6: Run full build and lint

**Files:** (no new changes — verification only)

- [ ] **Step 1: Run the full build**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run lint**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && pnpm lint`
Expected: No lint errors. If there are formatting issues, fix them with `pnpm lint --fix` and commit.

- [ ] **Step 3: Run all tests**

Run: `cd ~/coding/marswave/listenhub-sdk/.worktrees/listenhub-sdk--126 && pnpm test`
Expected: All tests pass (existing + new video-generation tests)

- [ ] **Step 4: Fix any issues and commit if needed**

If lint or build found issues:

```bash
git add -A
git commit -m "fix: lint/build fixes"
```
