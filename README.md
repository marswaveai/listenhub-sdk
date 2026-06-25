# @marswave/listenhub-sdk

[![npm version](https://img.shields.io/npm/v/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)
[![license](https://img.shields.io/npm/l/@marswave/listenhub-sdk)](https://github.com/marswaveai/listenhub-sdk/blob/main/LICENSE)
[![types](https://img.shields.io/npm/types/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)

JavaScript SDK for the [ListenHub](https://listenhub.ai) API.

## Install

```sh
npm i @marswave/listenhub-sdk
```

## Quick start

### OpenAPI Key (recommended for server-side)

No OAuth flow required — just pass your API Key:

```ts
import {OpenAPIClient} from '@marswave/listenhub-sdk';

const client = new OpenAPIClient({apiKey: 'lh_sk_...'});
// or set LISTENHUB_API_KEY env var and call new OpenAPIClient()

const {items: speakers} = await client.listSpeakers({language: 'en'});
const {episodeId} = await client.createFlowSpeech({
	sources: [{type: 'text', content: 'Hello world'}],
	speakers: [{speakerId: speakers[0].speakerId}],
});
```

### OAuth (for client-side apps)

Clone the repo and run the OAuth login example — it opens a browser, handles the callback, and prints your tokens:

```sh
git clone https://github.com/marswaveai/listenhub-sdk.git
cd listenhub-sdk
pnpm i
npx tsx examples/oauth-login.ts
```

## Client options

The SDK provides two clients for different auth modes:

```ts
// OpenAPI Key — server-side, no user login required
const openapi = new OpenAPIClient({
	apiKey: 'lh_sk_...', // or LISTENHUB_API_KEY env var
	baseURL: 'https://api.marswave.ai/openapi', // or LISTENHUB_OPENAPI_URL env var
	timeout: 60_000,
	maxRetries: 2,
});

// OAuth access token — client-side, user login required
const client = new ListenHubClient({
	accessToken: 'token', // static string or () => string | undefined
	baseURL: 'https://api.listenhub.ai/api',
	timeout: 30_000,
	maxRetries: 2,
});
```

## Examples

### OpenAPI Key

| File                                                     | Description                                 |
| -------------------------------------------------------- | ------------------------------------------- |
| [`examples/openapi-basic.ts`](examples/openapi-basic.ts) | Create flow speech, poll, and check credits |

### OAuth (ListenHubClient)

| File                                                                       | Description                              |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [`examples/oauth-login.ts`](examples/oauth-login.ts)                       | Browser-based OAuth login flow           |
| [`examples/basic.ts`](examples/basic.ts)                                   | Checkin, API key, error handling         |
| [`examples/create-podcast.ts`](examples/create-podcast.ts)                 | Create a duo podcast and poll for result |
| [`examples/create-tts.ts`](examples/create-tts.ts)                         | Text-to-speech from plain text           |
| [`examples/create-explainer-video.ts`](examples/create-explainer-video.ts) | Explainer video from a URL               |
| [`examples/create-slides.ts`](examples/create-slides.ts)                   | Slide deck presentation                  |
| [`examples/create-ai-image.ts`](examples/create-ai-image.ts)               | AI image generation from a prompt        |
| [`examples/music.ts`](examples/music.ts)                                   | Music generation and cover from audio    |
| [`examples/video-generation.ts`](examples/video-generation.ts)             | Video generation with SeeDance2.0        |

## Documentation

| Document                             | Description                                           |
| ------------------------------------ | ----------------------------------------------------- |
| [Architecture](docs/architecture.md) | Module dependency diagram and responsibilities        |
| [Client Behavior](docs/client.md)    | Request/response flow, hooks, retry and refresh logic |
| [Testing](docs/testing.md)           | Test layers, running tests, mock server setup         |

## API

### Auth

| Method                            | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| `connectInit({callbackPort})`     | Start OAuth flow, returns `authUrl` and `sessionId` |
| `connectToken({sessionId, code})` | Exchange authorization code for tokens              |
| `refresh({refreshToken})`         | Refresh an expired access token                     |
| `revoke({refreshToken})`          | Revoke a refresh token                              |

### Checkin

| Method            | Description                    |
| ----------------- | ------------------------------ |
| `checkinSubmit()` | Submit daily check-in          |
| `checkinStatus()` | Get check-in streak and status |

### Settings

| Method               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `getApiKey()`        | Get current API key                             |
| `regenerateApiKey()` | Regenerate API key (triggers `onApiKeyChanged`) |
| `getSettings()`      | Get episode template settings per product type  |

### Content creation

| Method                         | Description                        |
| ------------------------------ | ---------------------------------- |
| `createPodcast(params)`        | Create a podcast (solo/duo)        |
| `createTTS(params)`            | Create a text-to-speech audio      |
| `createExplainerVideo(params)` | Create an explainer video          |
| `createSlides(params)`         | Create a slides presentation       |
| `createAIImage(params)`        | Generate an AI image from a prompt |

### Music

Powered by the Mureka provider (the default). Generation endpoints are asynchronous —
they return a `taskId`; poll `getMusicTask(taskId)` until status is `success`.
Analysis endpoints (`recognize` / `describe` / `stem`) are synchronous.
File inputs accept a `Blob` (browser `File`, or `new Blob([buffer])` in Node 18+).

| Method                            | Kind  | Description                                            |
| --------------------------------- | ----- | ------------------------------------------------------ |
| `createMusicGenerate(params)`     | async | Generate music from a text prompt / lyrics             |
| `createMusicRemix(params)`        | async | Re-create a song from existing audio + new lyrics      |
| `createMusicInstrumental(params)` | async | Generate an instrumental (prompt or reference audio)   |
| `createMusicSoundtrack(params)`   | async | Generate music from an image or a video                |
| `createMusicTrack(params)`        | async | Generate a single instrument/vocal track               |
| `createMusicExtend(params)`       | async | Extend an existing song (legacy Suno)                  |
| `createMusicCover(params)`        | async | _Deprecated_ — cover via legacy Suno provider          |
| `recognizeMusic(params)`          | sync  | Transcribe lyrics with timestamps                      |
| `describeMusic(params)`           | sync  | Analyze audio (description, tags, genres, instruments) |
| `stemMusic(params)`               | sync  | Separate audio into stems (returns ZIP download URLs)  |
| `getMusicTask(taskId)`            | —     | Get music task status and details                      |
| `listMusicTasks(params?)`         | —     | List music tasks with optional filtering               |

```ts
// Generate, then poll
const {taskId} = await client.createMusicGenerate({prompt: 'lo-fi chill beats', model: 'auto'});
let task = await client.getMusicTask(taskId);
while (task.status !== 'success' && task.status !== 'failed') {
	await new Promise((r) => setTimeout(r, 5000));
	task = await client.getMusicTask(taskId);
}

// Remix from a local file (Node 18+)
import {readFile} from 'node:fs/promises';
const audio = new Blob([await readFile('./song.mp3')]);
await client.createMusicRemix({
	audio,
	audioFilename: 'song.mp3',
	lyrics: '...',
	prompt: 'jazzy remix',
});

// Synchronous analysis
const {result} = await client.describeMusic({audio, audioFilename: 'song.mp3'});
```

### Video Generation (SeeDance2.0 / HappyHorse / PixVerse)

| Method                                   | Description                                         |
| ---------------------------------------- | --------------------------------------------------- |
| `createVideoGeneration(params)`          | Create a video generation task                      |
| `getVideoGenerationTask(taskId)`         | Get video generation task status and details        |
| `listVideoGenerationTasks(params?)`      | List video generation tasks with optional filtering |
| `estimateVideoGenerationCredits(params)` | Estimate credit cost before generating              |
| `createPixVerseVideoGeneration(params)`  | Create a PixVerse video generation task             |
| `estimatePixVerseVideoCredits(params)`   | Estimate PixVerse credit cost before generating     |

Supported models: `doubao-seedance-2-pro`, `doubao-seedance-2-fast`, `happyhorse`; PixVerse: `pixverse`, `v6`, `v5`, `v4.5`

**HappyHorse examples:**

```ts
// Text-to-Video
await client.createVideoGeneration({
	model: 'happyhorse',
	content: [{type: 'text', text: '一只猫在月球上跳舞'}],
	resolution: '720p',
	ratio: '4:5',
	duration: 5,
});

// Image-to-Video
await client.createVideoGeneration({
	model: 'happyhorse',
	content: [
		{type: 'text', text: '让画面动起来'},
		{type: 'image_url', image_url: {url: 'https://...'}, role: 'first_frame'},
	],
	resolution: '1080p',
	duration: 5,
});

// Video-Edit
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

**PixVerse examples:**

PixVerse uses a separate endpoint (`createPixVerseVideoGeneration`) with a `capability`-driven
request shape. Poll results with the shared `getVideoGenerationTask` / `listVideoGenerationTasks`.

```ts
// Estimate credits
const {credits} = await client.estimatePixVerseVideoCredits({
	capability: 'text_to_video',
	quality: '720p',
	duration: 5,
});

// Text-to-Video (defaults: model 'pixverse', language 'en', quality '720p', aspectRatio '16:9')
await client.createPixVerseVideoGeneration({
	capability: 'text_to_video',
	prompt: '一只猫在花园里奔跑',
	quality: '720p',
	aspectRatio: '16:9',
	duration: 5,
});

// Image-to-Video
await client.createPixVerseVideoGeneration({
	capability: 'image_to_video',
	prompt: '让画面动起来',
	images: [{url: 'https://example.com/cat.jpg'}],
	quality: '1080p',
	duration: 5,
});

// Marketing Agent (promo_mix needs >= 4 images; agent duration must be 20/30/60)
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

### List by product

| Method                         | Description                             |
| ------------------------------ | --------------------------------------- |
| `listPodcasts(params?)`        | List podcast episodes                   |
| `listTTS(params?)`             | List TTS episodes                       |
| `listExplainerVideos(params?)` | List explainer videos                   |
| `listSlides(params?)`          | List slides                             |
| `listAIImages(params?)`        | List AI-generated items                 |
| `getCreation(episodeId)`       | Get full creation detail                |
| `deleteCreations({ids})`       | Batch delete creations (incl. AI video) |
| `deleteAIImages({ids})`        | Batch delete AI images                  |

### Users

| Method              | Description                            |
| ------------------- | -------------------------------------- |
| `getCurrentUser()`  | Get current user profile               |
| `getSubscription()` | Get subscription and credit usage info |

### Speakers

| Method                  | Description                         |
| ----------------------- | ----------------------------------- |
| `listSpeakers(params?)` | List available speakers by language |

### Custom requests

`client.api` exposes the underlying [ky](https://github.com/sindresorhus/ky) instance for endpoints not yet covered by the SDK:

```ts
const user = await client.api.get('v1/users/me').json();
```

## OpenAPIClient API

The `OpenAPIClient` provides access to all OpenAPI endpoints using API Key authentication.

### Speakers

| Method                  | Description                         |
| ----------------------- | ----------------------------------- |
| `listSpeakers(params?)` | List available speakers by language |

### Flow Speech

| Method                                      | Description                         |
| ------------------------------------------- | ----------------------------------- |
| `createFlowSpeech(params)`                  | Create a flow speech episode        |
| `getFlowSpeech(episodeId)`                  | Get flow speech status and details  |
| `getFlowSpeechTextStream(episodeId, event)` | Stream script or outline text (SSE) |
| `createFlowSpeechTTS(params)`               | Create flow speech from scripts     |

### Podcast

| Method                                   | Description                          |
| ---------------------------------------- | ------------------------------------ |
| `createPodcast(params)`                  | Create a podcast episode             |
| `getPodcast(episodeId)`                  | Get podcast status and details       |
| `getPodcastTextStream(episodeId, event)` | Stream script or outline text (SSE)  |
| `createPodcastTextContent(params)`       | Create text-only content (no audio)  |
| `generatePodcastAudio(episodeId)`        | Generate audio for text-only episode |

### TTS

| Method                | Description                             |
| --------------------- | --------------------------------------- |
| `speech(params)`      | Multi-speaker speech, returns audio URL |
| `tts(params)`         | Single-voice TTS, returns audio stream  |
| `audioSpeech(params)` | OpenAI-compatible TTS, returns stream   |

### Storybook

| Method                              | Description                   |
| ----------------------------------- | ----------------------------- |
| `createStorybook(params)`           | Create a storybook episode    |
| `getStorybook(episodeId)`           | Get storybook details         |
| `generateStorybookVideo(episodeId)` | Generate video from storybook |

### Image

| Method                | Description                          |
| --------------------- | ------------------------------------ |
| `createImage(params)` | Generate an image (google or openai) |

### Video Generation

| Method                              | Description                            |
| ----------------------------------- | -------------------------------------- |
| `createVideoGeneration(params)`     | Create a video generation task         |
| `getVideoGenerationTask(taskId)`    | Get task status and video URL          |
| `listVideoGenerationTasks(params?)` | List tasks with optional filtering     |
| `estimateVideoCredits(params)`      | Estimate credit cost before generating |

### Content Extract

| Method                         | Description                |
| ------------------------------ | -------------------------- |
| `createContentExtract(params)` | Extract content from a URL |
| `getContentExtract(taskId)`    | Get extraction result      |

### User

| Method              | Description                            |
| ------------------- | -------------------------------------- |
| `getSubscription()` | Get subscription and credit usage info |

## Rate limiting

On `429 Too Many Requests`, the SDK reads the `Retry-After` header and retries automatically, up to `maxRetries` times (default: 2).

## License

[MIT](LICENSE)
