/**
 * Voice cloning types for {@link ListenHubClient} (App/JWT surface).
 *
 * Source of truth: listenhub-api-server `src/controller/voice-clone.ts`.
 * The JWT surface and the API-key surface have different request and response
 * contracts. Do not share their endpoint types between the two clients.
 *
 * `/v1/voice-clone/chat` and `/v1/voice-clone/examples` back the interactive
 * web recording flow and are intentionally not part of the SDK surface.
 */

/** One reference audio file. */
export type VoiceCloneAudioInput = Blob;

/** Languages accepted by the voice-clone create endpoint. */
export type VoiceCloneLanguage =
	| 'en'
	| 'zh'
	| 'ja'
	| 'es'
	| 'pt'
	| 'fr'
	| 'de'
	| 'tr'
	| 'ko'
	| 'it'
	| 'th'
	| 'vi';

export type VoiceCloneGender = 'male' | 'female' | 'other';

export type VoiceCloneTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateVoiceCloneParams {
	/** 1-6 reference audio files (single file max 5MB, total max 20MB). */
	audioFiles: VoiceCloneAudioInput[];
	/** Filenames sent with each file, positionally matched to `audioFiles`. */
	audioFilenames?: string[];
	language: VoiceCloneLanguage;
}

export interface CreateVoiceCloneResponse {
	taskId: string;
	status: VoiceCloneTaskStatus;
}

/**
 * Poll result. A failed task raises a `ListenHubError` instead of returning
 * `status: 'failed'` — that is the JWT surface's behavior, and it differs from
 * the API-key surface, which returns the failure in the body.
 */
export interface VoiceCloneTaskDetail {
	status: VoiceCloneTaskStatus;
	/** Preview of the temporary cloned voice, available once cloning completes. */
	demoAudioUrl?: string;
}

export interface ConfirmVoiceCloneParams {
	taskId: string;
	/** Max 50 chars. */
	name: string;
	gender: VoiceCloneGender;
	/** Authorizes the 300-credit charge once the tier quota is used up. */
	useCredits?: boolean;
}

/** A confirmed private speaker, as returned by the detail and update endpoints. */
export interface VoiceCloneSpeaker {
	id: string;
	name: string;
	language: string;
	gender: string;
	demoAudioUrl?: string;
	createdAt: string;
	updatedAt: string;
}

/** List rows carry `speakerInnerId` (the id accepted by TTS endpoints) but no `updatedAt`. */
export interface VoiceCloneSpeakerListItem {
	id: string;
	name: string;
	speakerInnerId: string;
	language: string;
	gender: string;
	demoAudioUrl?: string;
	createdAt: string;
}

export interface ListVoiceCloneSpeakersResponse {
	speakers: VoiceCloneSpeakerListItem[];
	/** Confirmations allowed per subscription period. */
	quota: number;
	/** True once this period's confirmations are used up. */
	isLimitReached: boolean;
	/** Maximum private speakers the tier may keep at once. */
	maxSpeakers: number;
	remainingConfirmations: number;
}

export interface UpdateVoiceCloneSpeakerParams {
	/** Max 50 chars. */
	name?: string;
	gender?: VoiceCloneGender;
}

export interface DeleteVoiceCloneSpeakerResponse {
	speakerId: string;
}
