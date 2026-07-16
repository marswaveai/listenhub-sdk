# Graph Report - listenhub-sdk--436  (2026-07-16)

## Corpus Check
- 63 files · ~21,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 576 nodes · 1209 edges · 43 communities (25 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53dad0fb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_listenhub.ts|listenhub.ts]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_Client Behavior|Client Behavior]]
- [[_COMMUNITY_API|API]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_episodes.ts|episodes.ts]]
- [[_COMMUNITY_music.ts|music.ts]]
- [[_COMMUNITY_openapi-client.test.ts|openapi-client.test.ts]]
- [[_COMMUNITY_openapi.ts|openapi.ts]]
- [[_COMMUNITY_CreateMusicTaskResponse|CreateMusicTaskResponse]]
- [[_COMMUNITY_OpenAPIClient|OpenAPIClient]]
- [[_COMMUNITY__login.ts|_login.ts]]
- [[_COMMUNITY_openapi-client.ts|openapi-client.ts]]
- [[_COMMUNITY_listenhub-voice.ts|listenhub-voice.ts]]
- [[_COMMUNITY_images.ts|images.ts]]
- [[_COMMUNITY_media-metadata.ts|media-metadata.ts]]
- [[_COMMUNITY_OpenAPICreateEpisodeResponse|OpenAPICreateEpisodeResponse]]
- [[_COMMUNITY_ListenHubClient|ListenHubClient]]
- [[_COMMUNITY_auth.ts|auth.ts]]
- [[_COMMUNITY_.listByProduct|.listByProduct]]
- [[_COMMUNITY_video-generation.test.ts|video-generation.test.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_ListenHub SDK|ListenHub SDK]]
- [[_COMMUNITY_settings.ts|settings.ts]]
- [[_COMMUNITY_OpenAPIEstimateVideoCreditsResponse|OpenAPIEstimateVideoCreditsResponse]]
- [[_COMMUNITY_auth.test.ts|auth.test.ts]]
- [[_COMMUNITY_checkin.test.ts|checkin.test.ts]]
- [[_COMMUNITY_episodes.test.ts|episodes.test.ts]]
- [[_COMMUNITY_images.test.ts|images.test.ts]]
- [[_COMMUNITY_listenhub-voice.test.ts|listenhub-voice.test.ts]]
- [[_COMMUNITY_oauth-login.ts|oauth-login.ts]]
- [[_COMMUNITY_CreateVideoGenerationParams|CreateVideoGenerationParams]]
- [[_COMMUNITY_EstimatePixVerseVideoCreditsParams|EstimatePixVerseVideoCreditsParams]]
- [[_COMMUNITY_EstimateVideoGenerationCreditsParams|EstimateVideoGenerationCreditsParams]]
- [[_COMMUNITY_ListVideoGenerationTasksParams|ListVideoGenerationTasksParams]]
- [[_COMMUNITY_login.test.ts|login.test.ts]]
- [[_COMMUNITY_settings.test.ts|settings.test.ts]]
- [[_COMMUNITY_speakers.test.ts|speakers.test.ts]]
- [[_COMMUNITY_users.test.ts|users.test.ts]]
- [[_COMMUNITY_OpenAPIVideoGenerationTaskDetail|OpenAPIVideoGenerationTaskDetail]]

## God Nodes (most connected - your core abstractions)
1. `ListenHubClient` - 76 edges
2. `OpenAPIClient` - 49 edges
3. `CreateMusicTaskResponse` - 18 edges
4. `scripts` - 13 edges
5. `appendMusicField()` - 13 edges
6. `ListenHubError` - 12 edges
7. `API` - 12 edges
8. `OpenAPIClient API` - 12 edges
9. `login()` - 11 edges
10. `getImageDimensions()` - 10 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (43 total, 18 thin omitted)

### Community 0 - "listenhub.ts"
Cohesion: 0.07
Nodes (32): createHttpClient(), parseErrorResponse(), createFileUpload(), getUploadContentType(), getUploadFileName(), getUploadFileSize(), isBlob(), toBodyInit() (+24 more)

### Community 1 - "package.json"
Cohesion: 0.04
Nodes (46): bugs, url, dependencies, ky, description, devDependencies, express, get-port (+38 more)

### Community 2 - "Client Behavior"
Cohesion: 0.06
Nodes (31): Code Style, Contributing, Getting Started, Prerequisites, Pull Requests, Testing, Architecture, client.ts (+23 more)

### Community 3 - "API"
Cohesion: 0.06
Nodes (36): API, Auth, Checkin, Client options, Content creation, Content Extract, Custom requests, Documentation (+28 more)

### Community 4 - "index.ts"
Cohesion: 0.11
Nodes (33): CreatePixVerseVideoParams, CreatePixVerseVideoResponse, PixVerseAgentType, PixVerseAspectRatio, PixVerseAsset, PixVerseBrandSticker, PixVerseBrandStickerPosition, PixVerseCapability (+25 more)

### Community 5 - "episodes.ts"
Cohesion: 0.07
Nodes (26): ContentSource, CreateEpisodeResponse, CreateExplainerVideoParams, CreatePodcastParams, CreateSlidesParams, CreateTTSParams, DeleteEpisodesParams, EpisodeCreator (+18 more)

### Community 6 - "music.ts"
Cohesion: 0.10
Nodes (15): DescribeMusicParams, DescribeMusicResponse, ListMusicTasksParams, ListMusicTasksResponse, MusicFileInput, MusicGenerateType, MusicModel, MusicTaskDetail (+7 more)

### Community 7 - "openapi-client.test.ts"
Cohesion: 0.10
Nodes (5): client, ListenHubError, createMockServer(), mockFetch, mockFetch

### Community 8 - "openapi.ts"
Cohesion: 0.09
Nodes (21): OpenAPICreateListenHubVoiceParams, OpenAPICreateListenHubVoiceResponse, OpenAPIGenerateAudioParams, OpenAPIGenerateAudioResponse, OpenAPIImageReferenceFileData, OpenAPIImageReferenceInlineData, OpenAPIListenHubVoiceTaskStatus, OpenAPIPixVerseAgentType (+13 more)

### Community 9 - "CreateMusicTaskResponse"
Cohesion: 0.13
Nodes (9): appendMusicField(), CreateMusicCoverParams, CreateMusicExtendParams, CreateMusicGenerateParams, CreateMusicInstrumentalParams, CreateMusicRemixParams, CreateMusicSoundtrackParams, CreateMusicTaskResponse (+1 more)

### Community 10 - "OpenAPIClient"
Cohesion: 0.09
Nodes (10): OpenAPIClient, OpenAPIClientOptions, OpenAPIContentExtractDetail, OpenAPICreateContentExtractParams, OpenAPIFlowSpeechDetail, OpenAPIListenHubVoiceTaskDetail, OpenAPIPodcastDetail, OpenAPIStorybookDetail (+2 more)

### Community 11 - "_login.ts"
Cohesion: 0.16
Nodes (3): login(), startCallbackServer(), ProcessStatus

### Community 12 - "openapi-client.ts"
Cohesion: 0.14
Nodes (12): OpenAPICreateImageParams, OpenAPICreateImageResponse, OpenAPICreatePixVerseVideoParams, OpenAPICreatePixVerseVideoResponse, OpenAPICreateVideoGenerationParams, OpenAPICreateVideoGenerationResponse, OpenAPIListListenHubVoiceTasksParams, OpenAPIListListenHubVoiceTasksResponse (+4 more)

### Community 13 - "listenhub-voice.ts"
Cohesion: 0.13
Nodes (13): CreateListenHubVoiceParams, CreateListenHubVoiceResponse, ListenHubVoiceConfig, ListenHubVoiceFormat, ListenHubVoiceImageInput, ListenHubVoiceImageResponse, ListenHubVoiceModel, ListenHubVoiceTaskDetail (+5 more)

### Community 14 - "images.ts"
Cohesion: 0.15
Nodes (10): AIImageAspectRatio, AIImageItem, AIImageSize, CreateAIImageParams, CreateAIImageResponse, DeleteAIImagesParams, ImageModel, ImagePromptLanguage (+2 more)

### Community 15 - "media-metadata.ts"
Cohesion: 0.36
Nodes (13): byte(), getImageDimensions(), ImageDimensions, matches(), parseGif(), parseJpeg(), parsePng(), parseWebp() (+5 more)

### Community 16 - "OpenAPICreateEpisodeResponse"
Cohesion: 0.18
Nodes (6): OpenAPICreateEpisodeResponse, OpenAPICreateFlowSpeechParams, OpenAPICreateFlowSpeechTTSParams, OpenAPICreatePodcastParams, OpenAPICreateStorybookParams, OpenAPICreateTextContentResponse

### Community 18 - "auth.ts"
Cohesion: 0.25
Nodes (4): ConnectInitResponse, LogoutResult, StoredCredentials, TokenResponse

### Community 21 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 22 - "ListenHub SDK"
Cohesion: 0.33
Nodes (5): Architecture, Build & Test, Client Core Behavior, Coding Guardrails, ListenHub SDK

### Community 23 - "settings.ts"
Cohesion: 0.33
Nodes (4): SettingsItem, SettingsResponse, SettingsSpeaker, StyleImage

### Community 24 - "OpenAPIEstimateVideoCreditsResponse"
Cohesion: 0.40
Nodes (3): OpenAPIEstimatePixVerseCreditsParams, OpenAPIEstimateVideoCreditsParams, OpenAPIEstimateVideoCreditsResponse

## Knowledge Gaps
- **121 isolated node(s):** `client`, `client`, `name`, `version`, `description` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ListenHubClient` connect `ListenHubClient` to `listenhub.ts`, `index.ts`, `episodes.ts`, `music.ts`, `openapi-client.test.ts`, `CreateMusicTaskResponse`, `_login.ts`, `listenhub-voice.ts`, `images.ts`, `auth.ts`, `.listByProduct`, `video-generation.test.ts`, `settings.ts`, `auth.test.ts`, `checkin.test.ts`, `episodes.test.ts`, `images.test.ts`, `listenhub-voice.test.ts`, `oauth-login.ts`, `CreateVideoGenerationParams`, `EstimatePixVerseVideoCreditsParams`, `EstimateVideoGenerationCreditsParams`, `ListVideoGenerationTasksParams`, `login.test.ts`, `settings.test.ts`, `speakers.test.ts`, `users.test.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `OpenAPIClient` connect `OpenAPIClient` to `listenhub.ts`, `index.ts`, `music.ts`, `openapi-client.test.ts`, `openapi.ts`, `CreateMusicTaskResponse`, `OpenAPIVideoGenerationTaskDetail`, `openapi-client.ts`, `OpenAPICreateEpisodeResponse`, `OpenAPIEstimateVideoCreditsResponse`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `CreateMusicTaskResponse` connect `CreateMusicTaskResponse` to `listenhub.ts`, `index.ts`, `openapi-client.ts`, `music.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `client`, `client`, `name` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `listenhub.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06753246753246753 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Client Behavior` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._