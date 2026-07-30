# @marswave/listenhub-sdk

[![npm version](https://img.shields.io/npm/v/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)
[![license](https://img.shields.io/npm/l/@marswave/listenhub-sdk)](https://github.com/marswaveai/listenhub-sdk/blob/main/LICENSE)
[![types](https://img.shields.io/npm/types/@marswave/listenhub-sdk)](https://www.npmjs.com/package/@marswave/listenhub-sdk)

JavaScript SDK for the [ListenHub](https://listenhub.ai) API.

[中文文档](README.zh-CN.md)

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
	baseURL: 'https://api.listenhub.ai/api', // or LISTENHUB_API_URL env var
	timeout: 30_000,
	maxRetries: 2,
});
```

## Base URL configuration

Each client has its own default Base URL and its own override variable:

| Client            | Default Base URL                  | Override variable       |
| ----------------- | --------------------------------- | ----------------------- |
| `OpenAPIClient`   | `https://api.marswave.ai/openapi` | `LISTENHUB_OPENAPI_URL` |
| `ListenHubClient` | `https://api.listenhub.ai/api`    | `LISTENHUB_API_URL`     |

Resolution order for each client is `baseURL` option → environment variable → the built-in default. An explicit `baseURL` always wins. The value covers the **entire Base URL, including the path prefix** — the `OpenAPIClient` URL ends in `/openapi`, the `ListenHubClient` URL ends in `/api`. Paths you pass to `client.api` are relative to it (`v1/...`, no leading slash), so the prefix must stay in the Base URL.

### Restricted-network override

If the `listenhub.ai` / `marswave.ai` defaults are unreachable on your network (for example, the whole `listenhub.ai` domain is currently blocked from mainland China), set the Base URL to a reachable host. As of 2026-07-24 the `listenhub.app` host is a verified working override:

```ts
// OpenAPI client
const openapi = new OpenAPIClient({
	apiKey: 'lh_sk_...',
	baseURL: 'https://api.listenhub.app/openapi',
});

// OAuth client
const client = new ListenHubClient({
	accessToken: 'token',
	baseURL: 'https://api.listenhub.app/api',
});
```

Or via environment variables, without touching code:

```sh
export LISTENHUB_OPENAPI_URL="https://api.listenhub.app/openapi"  # OpenAPIClient
export LISTENHUB_API_URL="https://api.listenhub.app/api"          # ListenHubClient
```

This is an **override for restricted networks, not a new default** — the SDK still ships the `.ai` / `marswave.ai` defaults, and callers with normal connectivity should not set these. `listenhub.app` is only the currently-verified example; if it too becomes unreachable, point the Base URL at any other host that serves the same API, keeping the `/openapi` or `/api` suffix intact.

### Automatic domain selection

If you set neither `baseURL` nor the environment variable, the SDK picks the domain for you when the default one cannot be reached at the connection layer:

- The **first** request that fails to connect triggers a switch to a known alternate host (`api.listenhub.app` for both clients). The choice is written to `~/.config/listenhub/domain.json` (honouring `XDG_CONFIG_HOME`).
- Every later request — including `POST` — goes **straight to the selected host, once**. Nothing is sent to the dead domain again, and nothing is sent twice.
- If the selected host later stops connecting, the entry is dropped and the default domain is re-checked.

Two rules are worth knowing before you rely on it:

- **Non-idempotent requests are never resent to another domain.** A failed `POST` (create, generate, upload) is _not_ retried elsewhere — a connection failure does not prove the server never received it, and resending could bill you twice or produce duplicate output. The SDK records the reachable domain and throws a `DomainSwitchedError` telling you to retry; your retry then goes to the new domain. `GET` requests, being idempotent, do recover transparently.
- **An explicit `baseURL` or environment variable disables this entirely.** If you pin a Base URL, the SDK sends exactly there and never switches.

To pin a domain without spelling out a full URL, set `LISTENHUB_DOMAIN=app` (or `default` to force the built-in). This also skips the failed first request, which is useful if you already know the default domain is blocked. Where no filesystem is available (browsers, read-only containers) the selection is kept in memory for the life of the process instead — a failed write never breaks a request.

## Troubleshooting: `fetch failed`

`TypeError: fetch failed` means the request **never received an HTTP response** — the connection failed at the DNS / TLS / proxy / Base URL layer, so there is no status code and the SDK cannot wrap it into a `ListenHubError`. Check, in order:

1. **DNS / TLS / proxy** — can the host resolve and connect at all from this environment?
2. **Base URL** — is the client pointed at a reachable host? On a restricted network, use the override above (`https://api.listenhub.app/openapi` or `https://api.listenhub.app/api`).

Once the server is reachable, connection-layer errors give way to structured ones: an HTTP `401`, or a `ListenHubError` carrying `status` and a business `code` (e.g. `21007`). Those are **auth / request problems on a reachable service**, not connectivity problems — a different class of failure from `fetch failed`.

`listenhub.app` is the currently-verified reachable host; if it changes, swap in whatever host is reachable and keeps the `/openapi` or `/api` suffix.

## Examples

### OpenAPI Key

| File                                                     | Description                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| [`examples/openapi-basic.ts`](examples/openapi-basic.ts) | Create flow speech, poll, and check credits                        |
| [`examples/voice-clone.ts`](examples/voice-clone.ts)     | Clone a voice from reference audio, confirm it, then speak with it |

### OAuth (ListenHubClient)

| File                                                                       | Description                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| [`examples/oauth-login.ts`](examples/oauth-login.ts)                       | Browser-based OAuth login flow                   |
| [`examples/basic.ts`](examples/basic.ts)                                   | Checkin, API key, error handling                 |
| [`examples/create-podcast.ts`](examples/create-podcast.ts)                 | Create a duo podcast and poll for result         |
| [`examples/create-tts.ts`](examples/create-tts.ts)                         | Text-to-speech from plain text                   |
| [`examples/create-explainer-video.ts`](examples/create-explainer-video.ts) | Explainer video from a URL                       |
| [`examples/create-slides.ts`](examples/create-slides.ts)                   | Slide deck presentation                          |
| [`examples/create-ai-image.ts`](examples/create-ai-image.ts)               | AI image generation from a prompt                |
| [`examples/music.ts`](examples/music.ts)                                   | Music generation and cover from audio            |
| [`examples/video-generation.ts`](examples/video-generation.ts)             | Video generation with SeeDance2.0                |
| [`examples/listenhub-voice.ts`](examples/listenhub-voice.ts)               | ListenHub Voice generation (listenhub-voice-1.0) |

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
| `uploadVideoReferenceImage(params)`      | Upload a local image and return Seedance metadata   |
| `getVideoGenerationTask(taskId)`         | Get video generation task status and details        |
| `listVideoGenerationTasks(params?)`      | List video generation tasks with optional filtering |
| `estimateVideoGenerationCredits(params)` | Estimate credit cost before generating              |
| `createPixVerseVideoGeneration(params)`  | Create a PixVerse video generation task             |
| `estimatePixVerseVideoCredits(params)`   | Estimate PixVerse credit cost before generating     |

Supported models: `doubao-seedance-2-pro`, `doubao-seedance-2-fast`, `happyhorse`; PixVerse: `pixverse`, `v6`, `v5`, `v4.5`

Seedance reference images/videos need dimensions for server-side validation. Put media URLs in
`content`, and put dimensions in top-level `referenceImages` / `referenceVideos`.

```ts
// Local image helper: uploads the image and reads width/height for Seedance validation.
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

// URL input: provide metadata explicitly.
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

### ListenHub Voice (listenhub-voice-1.0)

| Method                             | Description                                        |
| ---------------------------------- | -------------------------------------------------- |
| `createListenHubVoice(params)`     | Create a ListenHub Voice generation task           |
| `getListenHubVoiceTask(taskId)`    | Get ListenHub Voice task status and audio URL      |
| `listListenHubVoiceTasks(params?)` | List ListenHub Voice tasks with optional filtering |

Constraints (enforced server-side): `text` <= 1400 chars; `voices` 1-3 items; `voices` and `image` are mutually exclusive; `durationHint` in `[1, 110]`. `audioUrl` is only present when `status === 'success'`.

```ts
// Single voice (id is a ListenHub speakerInnerId or an official platform voice_type)
const task = await client.createListenHubVoice({
	text: '欢迎收听 ListenHub。',
	voices: [{type: 'speaker', id: 'zh_female_wanwanxiaohe_moon_bigtts'}],
	audioConfig: {format: 'mp3'},
	durationHint: 30,
});

// Multi-voice dialogue (each item should be a custom reference audio)
await client.createListenHubVoice({
	text: '@音频1 你好。@音频2 你也好。',
	voices: [
		{type: 'reference', url: 'https://example.com/voice-a.mp3'},
		{type: 'reference', url: 'https://example.com/voice-b.mp3'},
	],
});

// Image-to-audio (mutually exclusive with voices)
await client.createListenHubVoice({
	text: '为这张图配一段旁白。',
	image: {url: 'https://example.com/scene.jpg'},
});

const detail = await client.getListenHubVoiceTask(task.taskId);
if (detail.status === 'success') {
	console.log(detail.audioUrl, detail.audioDuration);
}
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

### Voice Clone

Upload reference audio, poll until cloning completes, then confirm it into a reusable
private speaker. Confirming is free within the tier quota; beyond it the server charges
300 credits, and only when `useCredits` is set. `zh` and `en` only on this surface.

| Method                                       | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `createVoiceClone(params)`                   | Create a clone task from 1-6 reference audio files   |
| `getVoiceCloneTask(taskId)`                  | Poll a clone task; throws once cloning failed        |
| `confirmVoiceClone(params)`                  | Confirm a completed task into a private speaker      |
| `listVoiceCloneSpeakers()`                   | List private speakers with quota and remaining slots |
| `getVoiceCloneSpeaker(speakerId)`            | Get one private speaker                              |
| `updateVoiceCloneSpeaker(speakerId, params)` | Rename a speaker or change its gender                |
| `deleteVoiceCloneSpeaker(speakerId)`         | Delete a speaker and free one slot                   |

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

### Files

| Method               | Description                                 |
| -------------------- | ------------------------------------------- |
| `createFileUpload()` | Create a presigned upload URL               |
| `uploadFile()`       | Create a presigned URL and upload file data |

### Video Generation

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `createVideoGeneration(params)`     | Create a video generation task                    |
| `uploadVideoReferenceImage(params)` | Upload a local image and return Seedance metadata |
| `getVideoGenerationTask(taskId)`    | Get task status and video URL                     |
| `listVideoGenerationTasks(params?)` | List tasks with optional filtering                |
| `estimateVideoCredits(params)`      | Estimate credit cost before generating            |

### ListenHub Voice

| Method                             | Description                              |
| ---------------------------------- | ---------------------------------------- |
| `createListenHubVoice(params)`     | Create a ListenHub Voice generation task |
| `getListenHubVoiceTask(taskId)`    | Get task status and audio URL            |
| `listListenHubVoiceTasks(params?)` | List tasks with optional filtering       |

### Voice Clone

Same flow as the OAuth surface, plus: `ja` is supported, every create must declare
`consentConfirmed: true` (you assert you hold the cloned person's consent), and
`autoConfirm` lets the poll that finds the task completed confirm it in the same call.
`getVoiceCloneTask` has three terminal shapes — failed (`errorCode`/`errorMessage`),
cloned but unconfirmed (`demoAudioUrl`, plus `confirmError` when auto-confirm failed),
and confirmed (`speakerId`, usable on `/v1/speech`, `/v1/tts` and `/v1/audio/speech`).

| Method                                       | Description                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| `createVoiceClone(params)`                   | Create a clone task; requires `consentConfirmed: true` |
| `getVoiceCloneTask(taskId)`                  | Poll a clone task; auto-confirms when asked to         |
| `confirmVoiceClone(params)`                  | Confirm a completed task, returns `speakerId`          |
| `listVoiceCloneSpeakers()`                   | List private speakers with quota and remaining slots   |
| `getVoiceCloneSpeaker(speakerId)`            | Get one private speaker                                |
| `updateVoiceCloneSpeaker(speakerId, params)` | Rename a speaker or change its gender                  |
| `deleteVoiceCloneSpeaker(speakerId)`         | Delete a speaker and free one slot                     |

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
