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

Clone the repo and run the OAuth login example — it opens a browser, handles the callback, and prints your tokens:

```sh
git clone https://github.com/marswaveai/listenhub-sdk.git
cd listenhub-sdk
pnpm i
npx tsx examples/oauth-login.ts
```

## Client options

```ts
const client = new ListenHubClient({
	accessToken: 'token', // static string or () => string | undefined
	baseURL: 'https://api.listenhub.ai/api',
	timeout: 30_000, // request timeout in ms
	maxRetries: 2, // max retries on 429 (default: 2)
});
```

## Examples

| File                                                                       | Description                              |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [`examples/basic.ts`](examples/basic.ts)                                   | Static token, API calls, error handling  |
| [`examples/oauth-login.ts`](examples/oauth-login.ts)                       | Browser-based OAuth login flow           |
| [`examples/create-podcast.ts`](examples/create-podcast.ts)                 | Create a duo podcast and poll for result |
| [`examples/create-tts.ts`](examples/create-tts.ts)                         | Text-to-speech from plain text           |
| [`examples/create-explainer-video.ts`](examples/create-explainer-video.ts) | Explainer video from a URL               |
| [`examples/create-slides.ts`](examples/create-slides.ts)                   | Slide deck presentation                  |
| [`examples/create-ai-image.ts`](examples/create-ai-image.ts)               | AI image generation from a prompt        |

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

### List by product

| Method                         | Description              |
| ------------------------------ | ------------------------ |
| `listPodcasts(params?)`        | List podcast episodes    |
| `listTTS(params?)`             | List TTS episodes        |
| `listExplainerVideos(params?)` | List explainer videos    |
| `listSlides(params?)`          | List slides              |
| `listAIImages(params?)`        | List AI-generated items  |
| `getCreation(episodeId)`       | Get full creation detail |
| `deleteCreations({ids})`       | Batch delete creations   |

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

## Rate limiting

On `429 Too Many Requests`, the SDK reads the `Retry-After` header and retries automatically, up to `maxRetries` times (default: 2).

## License

[MIT](LICENSE)
