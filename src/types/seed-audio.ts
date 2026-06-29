/**
 * Seed Audio (`seed-audio-1.0`) types for {@link ListenHubClient} (camelCase).
 *
 * Source of truth: listenhub-api-server `src/openapi-controllers/seed-audio.ts`,
 * `src/service/seed-audio/{request,index}.ts`, and `api-docs/listenhub.yaml`.
 * Only the three public endpoints are modeled here; `/v1/seed-audio/voices` and
 * `/v1/seed-audio/estimate-credits` are intentionally not part of the SDK surface.
 */

/** The only supported model. Must stay in sync with the server enum. */
export type SeedAudioModel = 'seed-audio-1.0';

/**
 * Public task statuses. The internal `pending_payment` state is never exposed —
 * the server maps it to `generating`.
 */
export type SeedAudioTaskStatus = 'pending' | 'generating' | 'uploading' | 'success' | 'failed';

/** Output audio container/codec. Defaults to `mp3` server-side. */
export type SeedAudioFormat = 'mp3' | 'wav' | 'pcm' | 'ogg_opus';

/**
 * A single voice element (one item of the `voices` array). Either:
 * - `{type: 'speaker', id}` — a registered voice: `id` is a ListenHub public
 *   `speakerInnerId` or a Doubao official `voice_type` (resolved server-side).
 * - `{type: 'reference', url}` — a custom reference audio URL to clone.
 */
export type SeedAudioVoice = {type: 'speaker'; id: string} | {type: 'reference'; url: string};

/**
 * Reference image input for end-to-end image-to-audio. `url`/`data` are mutually
 * exclusive (exactly one). Mutually exclusive with `voices`.
 */
export interface SeedAudioImageInput {
	/** Remote image URL (http/https). */
	url?: string;
	/** Base64-encoded image data. */
	data?: string;
}

export interface SeedAudioConfig {
	/** Speech rate, range [-50, 100]. */
	speechRate?: number;
	/** Loudness rate, range [-50, 100]. */
	loudnessRate?: number;
	/** Pitch rate, range [-12, 12]. */
	pitchRate?: number;
	/** Output format. Defaults to `mp3`. */
	format?: SeedAudioFormat;
}

/**
 * Parameters for creating a seed-audio generation task.
 *
 * Constraints (enforced server-side):
 * - `text`: required, trimmed, max 1400 chars.
 * - `voices`: 1-3 items. For multi-voice (>1), every item must be a `reference`
 *   (or a library reference-audio voice) — a Doubao official `voice_type` only
 *   works for single voice. Mutually exclusive with `image`.
 * - `image`: at most one image (`url` or `data`). Mutually exclusive with `voices`.
 * - `durationHint`: range [1, 110].
 */
export interface CreateSeedAudioParams {
	model?: SeedAudioModel;
	text: string;
	voices?: SeedAudioVoice[];
	image?: SeedAudioImageInput;
	audioConfig?: SeedAudioConfig;
	durationHint?: number;
	watermark?: boolean;
}

export interface CreateSeedAudioResponse {
	taskId: string;
	status: SeedAudioTaskStatus;
}

/**
 * Response-side reference image shape (sanitized). Never contains base64 `data`:
 * the server returns only `url` and/or `hasData` plus an optional `thumbnailUrl`.
 */
export interface SeedAudioImageResponse {
	url?: string;
	hasData?: boolean;
	thumbnailUrl?: string;
}

/**
 * A seed-audio task as returned by detail and list endpoints (same shape).
 * `audioUrl` is only present when `status === 'success'`.
 */
export interface SeedAudioTaskDetail {
	id: string;
	status: SeedAudioTaskStatus;
	model: string;
	params: {
		text: string;
		voices?: SeedAudioVoice[];
		image?: SeedAudioImageResponse;
		audioConfig?: SeedAudioConfig;
		durationHint?: number;
		watermark?: boolean;
	};
	/** Only exposed when `status === 'success'`. */
	audioUrl?: string;
	audioDuration?: number;
	creditCharged: number;
	creditRefunded: number;
	errorMessage?: string;
	createdAt: number;
	updatedAt: number;
}

/** List items share the same shape as the detail response. */
export type SeedAudioTaskListItem = SeedAudioTaskDetail;

export interface ListSeedAudioTasksParams {
	page?: number;
	pageSize?: number;
	status?: SeedAudioTaskStatus;
	keyword?: string;
}

export interface ListSeedAudioTasksResponse {
	items: SeedAudioTaskListItem[];
	page: number;
	pageSize: number;
	total: number;
}
