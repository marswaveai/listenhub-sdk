export interface ApiKeyResponse {
	key: string;
}

export interface StyleImage {
	id: string;
	name: string;
	uri: string;
	mimeType: string;
}

export interface SettingsSpeaker {
	id: string;
	name: string;
	speakerInnerId: string;
	gender: string;
}

export interface SettingsItem {
	type: string;
	language: string;
	speakers: SettingsSpeaker[];
	duration: string;
	mode: string;
	updatedAt: number;
	imagesConfig: {
		story?: StyleImage[];
		info?: StyleImage[];
		slides?: StyleImage[];
	};
}

export interface SettingsResponse {
	items: SettingsItem[];
}
