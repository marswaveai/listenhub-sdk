export type MusicTaskType =
	| 'GENERATE'
	| 'INSTRUMENTAL'
	| 'SOUNDTRACK'
	| 'COVER'
	| 'MASHUP'
	| 'EXTEND'
	| 'REMIX'
	| 'RECOGNIZE'
	| 'DESCRIBE'
	| 'STEM'
	| 'TRACK';

export type MusicTaskStatus = 'pending' | 'generating' | 'uploading' | 'success' | 'failed';

/** Mureka model tiers used by the default provider. */
export type MusicModel = 'auto' | 'mureka-7.6' | 'mureka-8' | 'mureka-9' | 'mureka-o2';

/** Track types supported by the single-track generation endpoint. */
export type MusicGenerateType =
	| 'Vocals'
	| 'Instrumental'
	| 'Drums'
	| 'Bass'
	| 'Guitar'
	| 'Keyboard'
	| 'Percussion'
	| 'Strings'
	| 'Synth'
	| 'FX'
	| 'Brass'
	| 'Woodwinds';

/**
 * Binary audio/image/video input for a multipart music endpoint.
 * Pass a Blob/File (browser) or `new Blob([buffer])` (Node 18+).
 */
export type MusicFileInput = Blob;

export interface CreateMusicGenerateParams {
	prompt?: string;
	lyrics?: string;
	model?: MusicModel;
	style?: string;
	title?: string;
	instrumental?: boolean;
	/** Reusable Vocal ID. */
	vocalId?: string;
}

/** @deprecated Cover is pinned to the legacy Suno provider; new code should use `createMusicRemix`. */
export interface CreateMusicCoverParams {
	uploadUrl: string;
	prompt?: string;
	style?: string;
	title?: string;
	instrumental?: boolean;
}

export interface CreateMusicExtendParams {
	uploadUrl: string;
	model: 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5';
	continueAt: number;
	prompt?: string;
	style?: string;
	title?: string;
	instrumental?: boolean;
	negativeTags?: string;
	vocalGender?: 'm' | 'f';
	styleWeight?: number;
	weirdnessConstraint?: number;
	audioWeight?: number;
}

/** Mureka remix: re-create a song from an existing track + new lyrics. */
export interface CreateMusicRemixParams {
	/** Audio source — exactly one of audio / audioUrl / providerSongId. */
	audio?: MusicFileInput;
	audioFilename?: string;
	/** Internal ListenHub audio URL (owned by the user or public). */
	audioUrl?: string;
	/** Mureka song id from a previous generation. */
	providerSongId?: string;
	lyrics: string;
	prompt: string;
}

/** Standalone instrumental generation — prompt XOR referenceAudio. */
export interface CreateMusicInstrumentalParams {
	prompt?: string;
	referenceAudio?: MusicFileInput;
	referenceAudioFilename?: string;
	model?: MusicModel;
}

/** Generate music from an image OR a video (mutually exclusive). */
export interface CreateMusicSoundtrackParams {
	image?: MusicFileInput;
	imageFilename?: string;
	video?: MusicFileInput;
	videoFilename?: string;
	prompt?: string;
	model?: MusicModel;
}

/** Generate a single instrument/vocal track. */
export interface CreateMusicTrackParams {
	/** Audio source — exactly one of audio / providerSongId. */
	audio?: MusicFileInput;
	audioFilename?: string;
	providerSongId?: string;
	generateType: MusicGenerateType;
	prompt: string;
	/** Required when generateType is 'Vocals'. */
	lyrics?: string;
	vocalGender?: 'male' | 'female';
	/** Range constraint in seconds. */
	generateStart?: number;
	generateEnd?: number;
}

export interface RecognizeMusicParams {
	audio: MusicFileInput;
	audioFilename?: string;
}

export interface DescribeMusicParams {
	audio: MusicFileInput;
	audioFilename?: string;
}

export interface StemMusicParams {
	audio: MusicFileInput;
	audioFilename?: string;
	model?: 'audio-separation-1' | 'audio-separation-2';
}

export interface CreateMusicTaskResponse {
	taskId: string;
	taskType: MusicTaskType;
	status: MusicTaskStatus;
}

export interface MusicTrack {
	title: string;
	tags: string;
	duration: number;
	audioUrl: string;
	flacUrl?: string;
	wavUrl?: string;
	providerSongId?: string;
	lyricsSections?: unknown[];
}

export interface MusicTaskDetail {
	id: string;
	provider: string;
	taskType: MusicTaskType;
	status: MusicTaskStatus;
	params: {
		model?: string;
		prompt?: string;
		style?: string;
		title?: string;
		customMode?: boolean;
		instrumental?: boolean;
		[key: string]: unknown;
	};
	tracks: MusicTrack[];
	/** Present for sync endpoints (recognize/describe/stem). */
	result?: Record<string, unknown>;
	creditCost: number;
	errorMessage?: string;
	createdAt: number;
	updatedAt: number;
}

/** Synchronous lyric-recognition result. */
export interface RecognizeMusicResponse {
	id: string;
	status: 'success';
	creditCost: number;
	result: {
		duration: number;
		lyricsSections: unknown[];
	};
	createdAt: number;
}

/** Synchronous audio-analysis result. */
export interface DescribeMusicResponse {
	id: string;
	status: 'success';
	creditCost: number;
	result: {
		description: string;
		tags: string[];
		genres: string[];
		instruments: string[];
	};
	createdAt: number;
}

/** Synchronous stem-separation result (download links, ~24h expiry). */
export interface StemMusicResponse {
	id: string;
	status: 'success';
	creditCost: number;
	result: {
		zipUrl: string;
		midiZipUrl: string | null;
		expiresAt: number;
	};
	createdAt: number;
}

export interface ListMusicTasksParams {
	page?: number;
	pageSize?: number;
	status?: MusicTaskStatus;
}

export interface ListMusicTasksResponse {
	items: MusicTaskDetail[];
	page: number;
	pageSize: number;
	total: number;
}
