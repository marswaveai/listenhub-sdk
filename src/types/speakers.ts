export interface Speaker {
	id: string;
	name: string;
	speakerInnerId: string;
	personality: string;
	demoAudioUrl: string;
	gender: string;
	accessType: string;
	weight: number;
}

export interface ListSpeakersParams {
	language?: string;
	status?: number;
}

export interface ListSpeakersResponse {
	items: Speaker[];
}
