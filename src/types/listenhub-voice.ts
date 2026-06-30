/**
 * ListenHub Voice (`listenhub-voice-1.0`) types for {@link ListenHubClient} (camelCase).
 *
 * Source of truth: listenhub-api-server `src/openapi-controllers/seed-audio.ts`,
 * `src/service/seed-audio/{request,index}.ts`, and `api-docs/listenhub.yaml`.
 * Only the three public endpoints are modeled here; `/v1/listenhub-voice/voices` and
 * `/v1/listenhub-voice/estimate-credits` are intentionally not part of the SDK surface.
 */

/** The only supported model. Must stay in sync with the server enum. */
export type ListenHubVoiceModel = 'listenhub-voice-1.0';

/**
 * Public task statuses. The internal `pending_payment` state is never exposed —
 * the server maps it to `generating`.
 */
export type ListenHubVoiceTaskStatus =
	| 'pending'
	| 'generating'
	| 'uploading'
	| 'success'
	| 'failed';

/** Output audio container/codec. Defaults to `mp3` server-side. */
export type ListenHubVoiceFormat = 'mp3' | 'wav' | 'pcm' | 'ogg_opus';

/**
 * A single voice element (one item of the `voices` array). Either:
 * - `{type: 'speaker', id}` — a registered voice: `id` is a ListenHub public
 *   `speakerInnerId` or an official platform `voice_type` (resolved server-side).
 * - `{type: 'reference', url}` — a custom reference audio URL to clone.
 */
export type ListenHubVoiceVoice = {type: 'speaker'; id: string} | {type: 'reference'; url: string};

/**
 * Reference image input for end-to-end image-to-audio. `url`/`data` are mutually
 * exclusive (exactly one). Mutually exclusive with `voices`.
 */
export interface ListenHubVoiceImageInput {
	/** Remote image URL (http/https). */
	url?: string;
	/** Base64-encoded image data. */
	data?: string;
}

export interface ListenHubVoiceConfig {
	/** Speech rate, range [-50, 100]. */
	speechRate?: number;
	/** Loudness rate, range [-50, 100]. */
	loudnessRate?: number;
	/** Pitch rate, range [-12, 12]. */
	pitchRate?: number;
	/** Output format. Defaults to `mp3`. */
	format?: ListenHubVoiceFormat;
}

/**
 * Parameters for creating a ListenHub Voice generation task.
 *
 * Constraints (enforced server-side):
 * - `text`: required, trimmed, max 1400 chars.
 * - `voices`: 1-3 items. For multi-voice (>1), every item must be a `reference`
 *   (or a library reference-audio voice) — an official platform `voice_type` only
 *   works for single voice. Mutually exclusive with `image`.
 * - `image`: at most one image (`url` or `data`). Mutually exclusive with `voices`.
 * - `durationHint`: range [1, 110].
 */
export interface CreateListenHubVoiceParams {
	model?: ListenHubVoiceModel;
	text: string;
	voices?: ListenHubVoiceVoice[];
	image?: ListenHubVoiceImageInput;
	audioConfig?: ListenHubVoiceConfig;
	durationHint?: number;
	watermark?: boolean;
}

export interface CreateListenHubVoiceResponse {
	taskId: string;
	status: ListenHubVoiceTaskStatus;
}

/**
 * Response-side reference image shape (sanitized). Never contains base64 `data`:
 * the server returns only `url` and/or `hasData` plus an optional `thumbnailUrl`.
 */
export interface ListenHubVoiceImageResponse {
	url?: string;
	hasData?: boolean;
	thumbnailUrl?: string;
}

/**
 * A ListenHub Voice task as returned by detail and list endpoints (same shape).
 * `audioUrl` is only present when `status === 'success'`.
 */
export interface ListenHubVoiceTaskDetail {
	id: string;
	status: ListenHubVoiceTaskStatus;
	model: string;
	params: {
		text: string;
		voices?: ListenHubVoiceVoice[];
		image?: ListenHubVoiceImageResponse;
		audioConfig?: ListenHubVoiceConfig;
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
export type ListenHubVoiceTaskListItem = ListenHubVoiceTaskDetail;

export interface ListListenHubVoiceTasksParams {
	page?: number;
	pageSize?: number;
	status?: ListenHubVoiceTaskStatus;
	keyword?: string;
}

export interface ListListenHubVoiceTasksResponse {
	items: ListenHubVoiceTaskListItem[];
	page: number;
	pageSize: number;
	total: number;
}
