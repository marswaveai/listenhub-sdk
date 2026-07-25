# @marswave/listenhub-sdk

[![npm version](https://img.shields.io/npm/v/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)
[![license](https://img.shields.io/npm/l/@marswave/listenhub-sdk)](https://github.com/marswaveai/listenhub-sdk/blob/main/LICENSE)
[![types](https://img.shields.io/npm/types/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)

[ListenHub](https://listenhub.ai) API 的 JavaScript SDK。

[English](README.md)

## 安装

```sh
npm i @marswave/listenhub-sdk
```

## 快速开始

### OpenAPI Key（推荐用于服务端）

无需 OAuth 流程，传入 API Key 即可：

```ts
import {OpenAPIClient} from '@marswave/listenhub-sdk';

const client = new OpenAPIClient({apiKey: 'lh_sk_...'});
// 或设置 LISTENHUB_API_KEY 环境变量后直接 new OpenAPIClient()

const {items: speakers} = await client.listSpeakers({language: 'en'});
const {episodeId} = await client.createFlowSpeech({
	sources: [{type: 'text', content: 'Hello world'}],
	speakers: [{speakerId: speakers[0].speakerId}],
});
```

### OAuth（用于客户端应用）

克隆仓库并运行 OAuth 登录示例——它会打开浏览器、处理回调并打印你的 token：

```sh
git clone https://github.com/marswaveai/listenhub-sdk.git
cd listenhub-sdk
pnpm i
npx tsx examples/oauth-login.ts
```

## 客户端选项

SDK 为两种认证模式提供两个客户端：

```ts
// OpenAPI Key —— 服务端，无需用户登录
const openapi = new OpenAPIClient({
	apiKey: 'lh_sk_...', // 或 LISTENHUB_API_KEY 环境变量
	baseURL: 'https://api.marswave.ai/openapi', // 或 LISTENHUB_OPENAPI_URL 环境变量
	timeout: 60_000,
	maxRetries: 2,
});

// OAuth access token —— 客户端，需要用户登录
const client = new ListenHubClient({
	accessToken: 'token', // 静态字符串或 () => string | undefined
	baseURL: 'https://api.listenhub.ai/api', // 或 LISTENHUB_API_URL 环境变量
	timeout: 30_000,
	maxRetries: 2,
});
```

## Base URL 配置

每个客户端有各自的默认 Base URL 和各自的覆盖变量：

| 客户端            | 默认 Base URL                     | 覆盖变量                |
| ----------------- | --------------------------------- | ----------------------- |
| `OpenAPIClient`   | `https://api.marswave.ai/openapi` | `LISTENHUB_OPENAPI_URL` |
| `ListenHubClient` | `https://api.listenhub.ai/api`    | `LISTENHUB_API_URL`     |

每个客户端的取值顺序为 `baseURL` 选项 → 环境变量 → 内置默认值，显式传入的 `baseURL` 始终优先。覆盖值是**整个 Base URL，含路径前缀**——`OpenAPIClient` 的 URL 以 `/openapi` 结尾，`ListenHubClient` 的 URL 以 `/api` 结尾。你传给 `client.api` 的路径是相对于它的（`v1/...`，不带前导斜杠），所以路径前缀必须保留在 Base URL 里。

### 网络受限环境的覆盖

如果 `listenhub.ai` / `marswave.ai` 默认地址在你的网络下不可达（例如整个 `listenhub.ai` 域当前在中国大陆被封），把 Base URL 设为一个可达的主机。截至 2026-07-24，`listenhub.app` 主机是一个已验证可用的覆盖地址：

```ts
// OpenAPI 客户端
const openapi = new OpenAPIClient({
	apiKey: 'lh_sk_...',
	baseURL: 'https://api.listenhub.app/openapi',
});

// OAuth 客户端
const client = new ListenHubClient({
	accessToken: 'token',
	baseURL: 'https://api.listenhub.app/api',
});
```

或通过环境变量，不改动代码：

```sh
export LISTENHUB_OPENAPI_URL="https://api.listenhub.app/openapi"  # OpenAPIClient
export LISTENHUB_API_URL="https://api.listenhub.app/api"          # ListenHubClient
```

这是**网络受限环境的覆盖方式，不是新默认值**——SDK 出厂仍是 `.ai` / `marswave.ai` 默认地址，网络正常的调用方不需要设置它们。`listenhub.app` 只是当前已验证的示例；若它也变得不可达，把 Base URL 指向任何一个提供同样 API 的可达主机即可，保持 `/openapi` 或 `/api` 后缀不变。

### 自动域选择

`baseURL` 和环境变量都没设时，默认域在连接层不可达，SDK 会自己选域：

- **第一个**连不上的请求触发切换，切到内置备选域（两个 client 都是 `api.listenhub.app`），并把结果写进 `~/.config/listenhub/domain.json`（遵循 `XDG_CONFIG_HOME`）。
- 之后所有请求——**包括 POST**——直接发往选定域，**只发一次**。不会再打不通的域，也不会重复发送。
- 选定域之后又连不上，这条记录会被清掉，下次重新探默认域。

依赖它之前要知道两条规则：

- **非幂等请求绝不会被换域重发。** 创建、生成、上传这类 `POST` 失败后*不会*被发去另一个域——连接失败并不能证明服务端没收到，重发可能导致双份扣费或重复产出。SDK 只记录下可达的域，并抛出 `DomainSwitchedError` 提示你重试；你重试的那一次就走新域了。`GET` 是幂等的，会透明恢复。
- **显式 `baseURL` 或环境变量会完全关掉这套机制。** 一旦你钉死了 Base URL，SDK 就只往那里发，永不切换。

不想写完整 URL 的话，设 `LISTENHUB_DOMAIN=app` 即可钉住备选域（`default` 则强制用出厂默认）。这样连第一次失败的请求都省了，已经确知默认域被墙时很有用。没有文件系统的环境（浏览器、只读容器）会退化成进程内存级缓存——写不进磁盘绝不会让请求失败。

## 排查 `fetch failed`

`TypeError: fetch failed` 表示请求**根本没有收到 HTTP 响应**——连接在 DNS / TLS / 代理 / Base URL 层就失败了，因此没有状态码，SDK 也无法把它包装成 `ListenHubError`。按顺序检查：

1. **DNS / TLS / 代理**——从当前环境能否解析并连上该主机？
2. **Base URL**——客户端指向的是一个可达的主机吗？在受限网络下，使用上面的覆盖地址（`https://api.listenhub.app/openapi` 或 `https://api.listenhub.app/api`）。

服务器一旦可达，连接层错误就会变成结构化错误：HTTP `401`，或携带 `status` 和业务 `code`（例如 `21007`）的 `ListenHubError`。这些是**服务已可达后的鉴权 / 请求问题**，不是连通性问题——和 `fetch failed` 属于两类不同的失败。

`listenhub.app` 是当前已验证可达的主机；若它变化，换成任何可达且保持 `/openapi` 或 `/api` 后缀的主机即可。

## 示例

### OpenAPI Key

| 文件                                                     | 说明                             |
| -------------------------------------------------------- | -------------------------------- |
| [`examples/openapi-basic.ts`](examples/openapi-basic.ts) | 创建 flow speech、轮询并查看积分 |

### OAuth（ListenHubClient）

| 文件                                                                       | 说明                                        |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| [`examples/oauth-login.ts`](examples/oauth-login.ts)                       | 浏览器 OAuth 登录流程                       |
| [`examples/basic.ts`](examples/basic.ts)                                   | 签到、API key、错误处理                     |
| [`examples/create-podcast.ts`](examples/create-podcast.ts)                 | 创建双人播客并轮询结果                      |
| [`examples/create-tts.ts`](examples/create-tts.ts)                         | 从纯文本生成语音                            |
| [`examples/create-explainer-video.ts`](examples/create-explainer-video.ts) | 从 URL 生成讲解视频                         |
| [`examples/create-slides.ts`](examples/create-slides.ts)                   | 幻灯片演示                                  |
| [`examples/create-ai-image.ts`](examples/create-ai-image.ts)               | 从提示词生成 AI 图片                        |
| [`examples/music.ts`](examples/music.ts)                                   | 音乐生成与音频翻唱                          |
| [`examples/video-generation.ts`](examples/video-generation.ts)             | SeeDance2.0 视频生成                        |
| [`examples/listenhub-voice.ts`](examples/listenhub-voice.ts)               | ListenHub Voice 生成（listenhub-voice-1.0） |

## 文档

| 文档                                 | 说明                                 |
| ------------------------------------ | ------------------------------------ |
| [Architecture](docs/architecture.md) | 模块依赖图与职责                     |
| [Client Behavior](docs/client.md)    | 请求/响应流程、hooks、重试与刷新逻辑 |
| [Testing](docs/testing.md)           | 测试分层、运行测试、mock server 搭建 |

## API

### 认证

| 方法                              | 说明                                           |
| --------------------------------- | ---------------------------------------------- |
| `connectInit({callbackPort})`     | 启动 OAuth 流程，返回 `authUrl` 和 `sessionId` |
| `connectToken({sessionId, code})` | 用授权码换取 token                             |
| `refresh({refreshToken})`         | 刷新过期的 access token                        |
| `revoke({refreshToken})`          | 撤销 refresh token                             |

### 签到

| 方法              | 说明                   |
| ----------------- | ---------------------- |
| `checkinSubmit()` | 提交每日签到           |
| `checkinStatus()` | 查看签到连续天数与状态 |

### 设置

| 方法                 | 说明                                       |
| -------------------- | ------------------------------------------ |
| `getApiKey()`        | 获取当前 API key                           |
| `regenerateApiKey()` | 重新生成 API key（触发 `onApiKeyChanged`） |
| `getSettings()`      | 获取各产品类型的模板设置                   |

### 内容创作

| 方法                           | 说明                  |
| ------------------------------ | --------------------- |
| `createPodcast(params)`        | 创建播客（单人/双人） |
| `createTTS(params)`            | 创建语音合成音频      |
| `createExplainerVideo(params)` | 创建讲解视频          |
| `createSlides(params)`         | 创建幻灯片演示        |
| `createAIImage(params)`        | 从提示词生成 AI 图片  |

### 音乐

由 Mureka 提供方驱动（默认）。生成类接口是异步的——返回 `taskId`，需轮询 `getMusicTask(taskId)`
直到状态为 `success`。分析类接口（`recognize` / `describe` / `stem`）是同步的。
文件入参接受 `Blob`（浏览器 `File`，或 Node 18+ 里的 `new Blob([buffer])`）。

| 方法                              | 类型 | 说明                                    |
| --------------------------------- | ---- | --------------------------------------- |
| `createMusicGenerate(params)`     | 异步 | 从文本提示词 / 歌词生成音乐             |
| `createMusicRemix(params)`        | 异步 | 用已有音频 + 新歌词重制歌曲             |
| `createMusicInstrumental(params)` | 异步 | 生成器乐曲（提示词或参考音频）          |
| `createMusicSoundtrack(params)`   | 异步 | 从图片或视频生成音乐                    |
| `createMusicTrack(params)`        | 异步 | 生成单条乐器/人声轨道                   |
| `createMusicExtend(params)`       | 异步 | 续写已有歌曲（legacy Suno）             |
| `createMusicCover(params)`        | 异步 | _已废弃_ —— 通过 legacy Suno 提供方翻唱 |
| `recognizeMusic(params)`          | 同步 | 转写歌词并带时间戳                      |
| `describeMusic(params)`           | 同步 | 分析音频（描述、标签、流派、乐器）      |
| `stemMusic(params)`               | 同步 | 分离音轨（返回 ZIP 下载链接）           |
| `getMusicTask(taskId)`            | —    | 获取音乐任务状态与详情                  |
| `listMusicTasks(params?)`         | —    | 列出音乐任务，支持可选过滤              |

```ts
// 生成后轮询
const {taskId} = await client.createMusicGenerate({prompt: 'lo-fi chill beats', model: 'auto'});
let task = await client.getMusicTask(taskId);
while (task.status !== 'success' && task.status !== 'failed') {
	await new Promise((r) => setTimeout(r, 5000));
	task = await client.getMusicTask(taskId);
}

// 从本地文件翻唱（Node 18+）
import {readFile} from 'node:fs/promises';
const audio = new Blob([await readFile('./song.mp3')]);
await client.createMusicRemix({
	audio,
	audioFilename: 'song.mp3',
	lyrics: '...',
	prompt: 'jazzy remix',
});

// 同步分析
const {result} = await client.describeMusic({audio, audioFilename: 'song.mp3'});
```

### 视频生成（SeeDance2.0 / HappyHorse / PixVerse）

| 方法                                     | 说明                               |
| ---------------------------------------- | ---------------------------------- |
| `createVideoGeneration(params)`          | 创建视频生成任务                   |
| `uploadVideoReferenceImage(params)`      | 上传本地图片并返回 Seedance 元数据 |
| `getVideoGenerationTask(taskId)`         | 获取视频生成任务状态与详情         |
| `listVideoGenerationTasks(params?)`      | 列出视频生成任务，支持可选过滤     |
| `estimateVideoGenerationCredits(params)` | 生成前预估积分消耗                 |
| `createPixVerseVideoGeneration(params)`  | 创建 PixVerse 视频生成任务         |
| `estimatePixVerseVideoCredits(params)`   | 生成前预估 PixVerse 积分消耗       |

支持的模型：`doubao-seedance-2-pro`、`doubao-seedance-2-fast`、`happyhorse`；PixVerse：`pixverse`、`v6`、`v5`、`v4.5`

Seedance 的参考图片/视频需要尺寸做服务端校验。把媒体 URL 放进 `content`，把尺寸放进顶级的
`referenceImages` / `referenceVideos`。

```ts
// 本地图片辅助方法：上传图片并读取宽高用于 Seedance 校验。
import {readFile} from 'node:fs/promises';

const firstFrame = await client.uploadVideoReferenceImage({
	file: new Blob([await readFile('./cat.png')], {type: 'image/png'}),
	fileName: 'cat.png',
	role: 'first_frame',
});

await client.createVideoGeneration({
	model: 'doubao-seedance-2-fast',
	content: [{type: 'text', text: 'A cat running through a garden'}, firstFrame.content],
	referenceImages: [firstFrame.referenceImage],
	resolution: '720p',
	duration: 5,
});

// URL 入参：显式提供元数据。
await client.createVideoGeneration({
	model: 'doubao-seedance-2-fast',
	content: [
		{type: 'text', text: 'A cat running through a garden'},
		{type: 'image_url', image_url: {url: 'https://example.com/cat.jpg'}, role: 'first_frame'},
	],
	referenceImages: [{role: 'first_frame', width: 1080, height: 1920, size: 3_600_000}],
	resolution: '720p',
	duration: 5,
});
```

**HappyHorse 示例：**

```ts
// 文生视频
await client.createVideoGeneration({
	model: 'happyhorse',
	content: [{type: 'text', text: '一只猫在月球上跳舞'}],
	resolution: '720p',
	ratio: '4:5',
	duration: 5,
});

// 图生视频
await client.createVideoGeneration({
	model: 'happyhorse',
	content: [
		{type: 'text', text: '让画面动起来'},
		{type: 'image_url', image_url: {url: 'https://...'}, role: 'first_frame'},
	],
	resolution: '1080p',
	duration: 5,
});

// 视频编辑
await client.createVideoGeneration({
	model: 'happyhorse',
	content: [
		{type: 'text', text: '将背景替换为星空'},
		{type: 'video_url', video_url: {url: 'https://...'}, role: 'reference_video'},
	],
	resolution: '720p',
	duration: 5,
	inputVideoDuration: 10,
	audioSetting: 'origin',
});
```

**PixVerse 示例：**

PixVerse 使用独立的端点（`createPixVerseVideoGeneration`），请求形态由 `capability` 驱动。
用共享的 `getVideoGenerationTask` / `listVideoGenerationTasks` 轮询结果。

```ts
// 预估积分
const {credits} = await client.estimatePixVerseVideoCredits({
	capability: 'text_to_video',
	quality: '720p',
	duration: 5,
});

// 文生视频（默认：model 'pixverse'、language 'en'、quality '720p'、aspectRatio '16:9'）
await client.createPixVerseVideoGeneration({
	capability: 'text_to_video',
	prompt: '一只猫在花园里奔跑',
	quality: '720p',
	aspectRatio: '16:9',
	duration: 5,
});

// 图生视频
await client.createPixVerseVideoGeneration({
	capability: 'image_to_video',
	prompt: '让画面动起来',
	images: [{url: 'https://example.com/cat.jpg'}],
	quality: '1080p',
	duration: 5,
});

// 营销 Agent（promo_mix 需要 >= 4 张图片；agent 的 duration 必须是 20/30/60）
await client.createPixVerseVideoGeneration({
	capability: 'agent',
	prompt: '为这款产品制作一支广告',
	images: [
		{url: 'https://example.com/p1.jpg'},
		{url: 'https://example.com/p2.jpg'},
		{url: 'https://example.com/p3.jpg'},
		{url: 'https://example.com/p4.jpg'},
	],
	quality: '1080p',
	duration: 30,
	pixverse: {agentType: 'promo_mix'},
});
```

### ListenHub Voice（listenhub-voice-1.0）

| 方法                               | 说明                                    |
| ---------------------------------- | --------------------------------------- |
| `createListenHubVoice(params)`     | 创建 ListenHub Voice 生成任务           |
| `getListenHubVoiceTask(taskId)`    | 获取 ListenHub Voice 任务状态与音频 URL |
| `listListenHubVoiceTasks(params?)` | 列出 ListenHub Voice 任务，支持可选过滤 |

约束（服务端强制）：`text` <= 1400 字符；`voices` 1-3 项；`voices` 与 `image` 互斥；`durationHint` 在 `[1, 110]`。`audioUrl` 仅在 `status === 'success'` 时存在。

```ts
// 单音色（id 是 ListenHub 的 speakerInnerId 或官方平台的 voice_type）
const task = await client.createListenHubVoice({
	text: '欢迎收听 ListenHub。',
	voices: [{type: 'speaker', id: 'zh_female_wanwanxiaohe_moon_bigtts'}],
	audioConfig: {format: 'mp3'},
	durationHint: 30,
});

// 多音色对白（每一项应为自定义参考音频）
await client.createListenHubVoice({
	text: '@音频1 你好。@音频2 你也好。',
	voices: [
		{type: 'reference', url: 'https://example.com/voice-a.mp3'},
		{type: 'reference', url: 'https://example.com/voice-b.mp3'},
	],
});

// 图片转音频（与 voices 互斥）
await client.createListenHubVoice({
	text: '为这张图配一段旁白。',
	image: {url: 'https://example.com/scene.jpg'},
});

const detail = await client.getListenHubVoiceTask(task.taskId);
if (detail.status === 'success') {
	console.log(detail.audioUrl, detail.audioDuration);
}
```

### 按产品列表

| 方法                           | 说明                       |
| ------------------------------ | -------------------------- |
| `listPodcasts(params?)`        | 列出播客                   |
| `listTTS(params?)`             | 列出语音合成               |
| `listExplainerVideos(params?)` | 列出讲解视频               |
| `listSlides(params?)`          | 列出幻灯片                 |
| `listAIImages(params?)`        | 列出 AI 生成的图片         |
| `getCreation(episodeId)`       | 获取完整作品详情           |
| `deleteCreations({ids})`       | 批量删除作品（含 AI 视频） |
| `deleteAIImages({ids})`        | 批量删除 AI 图片           |

### 用户

| 方法                | 说明                   |
| ------------------- | ---------------------- |
| `getCurrentUser()`  | 获取当前用户资料       |
| `getSubscription()` | 获取订阅与积分使用信息 |

### 声音

| 方法                    | 说明               |
| ----------------------- | ------------------ |
| `listSpeakers(params?)` | 按语言列出可用声音 |

### 自定义请求

`client.api` 暴露底层的 [ky](https://github.com/sindresorhus/ky) 实例，用于 SDK 尚未覆盖的端点：

```ts
const user = await client.api.get('v1/users/me').json();
```

## OpenAPIClient API

`OpenAPIClient` 使用 API Key 认证访问所有 OpenAPI 端点。

### 声音

| 方法                    | 说明               |
| ----------------------- | ------------------ |
| `listSpeakers(params?)` | 按语言列出可用声音 |

### Flow Speech

| 方法                                        | 说明                          |
| ------------------------------------------- | ----------------------------- |
| `createFlowSpeech(params)`                  | 创建 flow speech              |
| `getFlowSpeech(episodeId)`                  | 获取 flow speech 状态与详情   |
| `getFlowSpeechTextStream(episodeId, event)` | 流式输出脚本或大纲文本（SSE） |
| `createFlowSpeechTTS(params)`               | 从脚本创建 flow speech        |

### 播客

| 方法                                     | 说明                          |
| ---------------------------------------- | ----------------------------- |
| `createPodcast(params)`                  | 创建播客                      |
| `getPodcast(episodeId)`                  | 获取播客状态与详情            |
| `getPodcastTextStream(episodeId, event)` | 流式输出脚本或大纲文本（SSE） |
| `createPodcastTextContent(params)`       | 仅创建文本内容（不生成音频）  |
| `generatePodcastAudio(episodeId)`        | 为纯文本作品生成音频          |

### TTS

| 方法                  | 说明                          |
| --------------------- | ----------------------------- |
| `speech(params)`      | 多音色语音，返回音频 URL      |
| `tts(params)`         | 单音色 TTS，返回音频流        |
| `audioSpeech(params)` | OpenAI 兼容的 TTS，返回音频流 |

### 故事书

| 方法                                | 说明             |
| ----------------------------------- | ---------------- |
| `createStorybook(params)`           | 创建故事书       |
| `getStorybook(episodeId)`           | 获取故事书详情   |
| `generateStorybookVideo(episodeId)` | 从故事书生成视频 |

### 图片

| 方法                  | 说明                         |
| --------------------- | ---------------------------- |
| `createImage(params)` | 生成图片（google 或 openai） |

### 文件

| 方法                 | 说明                          |
| -------------------- | ----------------------------- |
| `createFileUpload()` | 创建预签名上传 URL            |
| `uploadFile()`       | 创建预签名 URL 并上传文件数据 |

### 视频生成

| 方法                                | 说明                               |
| ----------------------------------- | ---------------------------------- |
| `createVideoGeneration(params)`     | 创建视频生成任务                   |
| `uploadVideoReferenceImage(params)` | 上传本地图片并返回 Seedance 元数据 |
| `getVideoGenerationTask(taskId)`    | 获取任务状态与视频 URL             |
| `listVideoGenerationTasks(params?)` | 列出任务，支持可选过滤             |
| `estimateVideoCredits(params)`      | 生成前预估积分消耗                 |

### ListenHub Voice

| 方法                               | 说明                          |
| ---------------------------------- | ----------------------------- |
| `createListenHubVoice(params)`     | 创建 ListenHub Voice 生成任务 |
| `getListenHubVoiceTask(taskId)`    | 获取任务状态与音频 URL        |
| `listListenHubVoiceTasks(params?)` | 列出任务，支持可选过滤        |

### 内容提取

| 方法                           | 说明            |
| ------------------------------ | --------------- |
| `createContentExtract(params)` | 从 URL 提取内容 |
| `getContentExtract(taskId)`    | 获取提取结果    |

### 用户

| 方法                | 说明                   |
| ------------------- | ---------------------- |
| `getSubscription()` | 获取订阅与积分使用信息 |

## 限流

遇到 `429 Too Many Requests` 时，SDK 会读取 `Retry-After` 头并自动重试，最多重试 `maxRetries` 次（默认 2 次）。

## 许可证

[MIT](LICENSE)
