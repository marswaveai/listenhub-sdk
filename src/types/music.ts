export type MusicTaskType = 'GENERATE' | 'COVER' | 'EXTEND';

export type MusicTaskStatus = 'pending' | 'generating' | 'uploading' | 'success' | 'failed';

export interface CreateMusicGenerateParams {
	prompt: string;
	style?: string;
	title?: string;
	instrumental?: boolean;
}

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
}

export interface MusicTaskDetail {
	id: string;
	provider: string;
	taskType: MusicTaskType;
	status: MusicTaskStatus;
	params: {
		model: string;
		prompt?: string;
		style?: string;
		title?: string;
		customMode: boolean;
		instrumental: boolean;
	};
	tracks: MusicTrack[];
	creditCost: number;
	errorMessage?: string;
	createdAt: number;
	updatedAt: number;
}

export interface ListMusicTasksParams {
	page?: number;
	pageSize?: number;
	status?: MusicTaskStatus;
}

export interface ListMusicTasksResponse {
	items: MusicTaskDetail[];
}
