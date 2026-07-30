import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {ListenHubClient} from '../../src/listenhub';
import {OpenAPIClient} from '../../src/openapi-client';

const mockFetch = vi.fn();

beforeEach(() => vi.stubGlobal('fetch', mockFetch));
afterEach(() => vi.restoreAllMocks());

type CapturedRequest = {
	url: string;
	method: string;
	json?: any;
	fields?: Record<string, string[]>;
	files?: Array<{field: string; name: string; size: number}>;
};

const captured: CapturedRequest[] = [];

beforeEach(() => {
	captured.length = 0;
});

function envelope(data: unknown) {
	return new Response(JSON.stringify({code: 0, message: 'Success', data}), {
		status: 200,
		headers: {'content-type': 'application/json'},
	});
}

/** Capture a JSON (or bodyless) request, then answer with a success envelope. */
function mockJson(data: unknown) {
	mockFetch.mockImplementationOnce(async (req: Request) => {
		const text = await req.text();
		captured.push({
			url: req.url,
			method: req.method,
			json: text ? JSON.parse(text) : undefined,
		});
		return envelope(data);
	});
}

/** Capture a multipart request, splitting scalar fields from file parts. */
function mockMultipart(data: unknown) {
	mockFetch.mockImplementationOnce(async (req: Request) => {
		const form = await req.formData();
		const fields: Record<string, string[]> = {};
		const files: Array<{field: string; name: string; size: number}> = [];

		for (const [key, value] of form.entries()) {
			if (typeof value === 'string') {
				(fields[key] ??= []).push(value);
			} else {
				files.push({field: key, name: value.name, size: value.size});
			}
		}

		captured.push({url: req.url, method: req.method, fields, files});
		return envelope(data);
	});
}

const audio = (bytes = 8) => new Blob([new Uint8Array(bytes)], {type: 'audio/mpeg'});

describe('ListenHubClient voice clone (JWT surface)', () => {
	const client = new ListenHubClient({baseURL: 'https://api.test.com/api'});

	it('createVoiceClone posts every reference file as multipart audioFiles in upload mode', async () => {
		mockMultipart({taskId: 'task-1', status: 'pending'});

		const result = await client.createVoiceClone({
			audioFiles: [audio(), audio(16)],
			audioFilenames: ['first.mp3', 'second.wav'],
			language: 'zh',
		});

		const req = captured[0]!;
		expect(req.url).toBe('https://api.test.com/api/v1/voice-clone/clone');
		expect(req.method).toBe('POST');
		expect(req.files).toEqual([
			{field: 'audioFiles', name: 'first.mp3', size: 8},
			{field: 'audioFiles', name: 'second.wav', size: 16},
		]);
		expect(req.fields).toEqual({language: ['zh'], mode: ['upload']});
		expect(result).toEqual({taskId: 'task-1', status: 'pending'});
	});

	it('createVoiceClone falls back to generated filenames', async () => {
		mockMultipart({taskId: 'task-2', status: 'pending'});

		await client.createVoiceClone({audioFiles: [audio(), audio()], language: 'en'});

		expect(captured[0]!.files!.map((file) => file.name)).toEqual(['audio-1.mp3', 'audio-2.mp3']);
	});

	it('getVoiceCloneTask gets the task and returns the demo audio', async () => {
		mockJson({status: 'completed', demoAudioUrl: 'https://cdn.test/demo.mp3'});

		const result = await client.getVoiceCloneTask('6915bde9cca4d3c8ecb3eaf5');

		expect(captured[0]!.url).toBe(
			'https://api.test.com/api/v1/voice-clone/clone/6915bde9cca4d3c8ecb3eaf5',
		);
		expect(captured[0]!.method).toBe('GET');
		expect(result).toEqual({status: 'completed', demoAudioUrl: 'https://cdn.test/demo.mp3'});
	});

	it('confirmVoiceClone posts the confirmation body', async () => {
		mockJson(null);

		await client.confirmVoiceClone({
			taskId: '6915bde9cca4d3c8ecb3eaf5',
			name: 'My Voice',
			gender: 'female',
			useCredits: true,
		});

		const req = captured[0]!;
		expect(req.url).toBe('https://api.test.com/api/v1/voice-clone/confirm');
		expect(req.method).toBe('POST');
		expect(req.json).toEqual({
			taskId: '6915bde9cca4d3c8ecb3eaf5',
			name: 'My Voice',
			gender: 'female',
			useCredits: true,
		});
	});

	it('listVoiceCloneSpeakers returns speakers with the quota block', async () => {
		mockJson({
			speakers: [
				{
					id: 'sp-1',
					name: 'My Voice',
					speakerInnerId: 'voice-clone-6915bde9cca4d3c8ecb3eaf5',
					language: 'zh',
					gender: 'female',
					demoAudioUrl: 'https://cdn.test/demo.mp3',
					createdAt: '2026-07-30T00:00:00.000Z',
				},
			],
			quota: 2,
			isLimitReached: false,
			maxSpeakers: 2,
			remainingConfirmations: 1,
		});

		const result = await client.listVoiceCloneSpeakers();

		expect(captured[0]!.url).toBe('https://api.test.com/api/v1/voice-clone/speakers');
		expect(captured[0]!.method).toBe('GET');
		expect(result.speakers[0]!.speakerInnerId).toBe('voice-clone-6915bde9cca4d3c8ecb3eaf5');
		expect(result.remainingConfirmations).toBe(1);
	});

	it('getVoiceCloneSpeaker, updateVoiceCloneSpeaker and deleteVoiceCloneSpeaker hit the speaker path', async () => {
		mockJson({id: 'sp-1', name: 'My Voice', language: 'zh', gender: 'female'});
		mockJson({id: 'sp-1', name: 'Renamed', language: 'zh', gender: 'other'});
		mockJson({speakerId: 'sp-1'});

		await client.getVoiceCloneSpeaker('sp-1');
		await client.updateVoiceCloneSpeaker('sp-1', {name: 'Renamed', gender: 'other'});
		const deleted = await client.deleteVoiceCloneSpeaker('sp-1');

		expect(captured.map((req) => [req.method, req.url])).toEqual([
			['GET', 'https://api.test.com/api/v1/voice-clone/speakers/sp-1'],
			['PUT', 'https://api.test.com/api/v1/voice-clone/speakers/sp-1'],
			['DELETE', 'https://api.test.com/api/v1/voice-clone/speakers/sp-1'],
		]);
		expect(captured[1]!.json).toEqual({name: 'Renamed', gender: 'other'});
		expect(deleted).toEqual({speakerId: 'sp-1'});
	});
});

describe('OpenAPIClient voice clone (API key surface)', () => {
	const client = new OpenAPIClient({
		apiKey: 'lh_sk_key_secret',
		baseURL: 'https://api.test.com/openapi',
	});

	it('createVoiceClone sends the consent declaration and auto-confirm fields as multipart scalars', async () => {
		mockMultipart({taskId: 'task-1', status: 'pending'});

		await client.createVoiceClone({
			audioFiles: [audio()],
			audioFilenames: ['reference.mp3'],
			language: 'ja',
			consentConfirmed: true,
			autoConfirm: true,
			name: 'API Voice',
			gender: 'other',
			useCredits: true,
		});

		const req = captured[0]!;
		expect(req.url).toBe('https://api.test.com/openapi/v1/voice-clone/clone');
		expect(req.method).toBe('POST');
		expect(req.files).toEqual([{field: 'audioFiles', name: 'reference.mp3', size: 8}]);
		expect(req.fields).toEqual({
			language: ['ja'],
			mode: ['upload'],
			consentConfirmed: ['true'],
			autoConfirm: ['true'],
			name: ['API Voice'],
			gender: ['other'],
			useCredits: ['true'],
		});
	});

	it('createVoiceClone omits auto-confirm fields for the two-step flow', async () => {
		mockMultipart({taskId: 'task-2', status: 'pending'});

		await client.createVoiceClone({
			audioFiles: [audio()],
			language: 'en',
			consentConfirmed: true,
		});

		expect(captured[0]!.fields).toEqual({
			language: ['en'],
			mode: ['upload'],
			consentConfirmed: ['true'],
		});
	});

	it('getVoiceCloneTask surfaces the failed terminal shape', async () => {
		mockJson({status: 'failed', errorCode: 30003, errorMessage: 'No voice detected'});

		const result = await client.getVoiceCloneTask('6915bde9cca4d3c8ecb3eaf5');

		expect(captured[0]!.url).toBe(
			'https://api.test.com/openapi/v1/voice-clone/clone/6915bde9cca4d3c8ecb3eaf5',
		);
		expect(result).toEqual({
			status: 'failed',
			errorCode: 30003,
			errorMessage: 'No voice detected',
		});
	});

	it('getVoiceCloneTask surfaces the cloned-but-unconfirmed terminal shape', async () => {
		mockJson({
			status: 'completed',
			demoAudioUrl: 'https://cdn.test/demo.mp3',
			confirmError: 'Saving this voice requires 300 credits.',
		});

		const result = await client.getVoiceCloneTask('6915bde9cca4d3c8ecb3eaf5');

		expect(result.speakerId).toBeUndefined();
		expect(result.confirmError).toBe('Saving this voice requires 300 credits.');
	});

	it('getVoiceCloneTask surfaces the confirmed terminal shape', async () => {
		mockJson({
			status: 'completed',
			demoAudioUrl: 'https://cdn.test/demo.mp3',
			speakerId: 'voice-clone-6915bde9cca4d3c8ecb3eaf5',
		});

		const result = await client.getVoiceCloneTask('6915bde9cca4d3c8ecb3eaf5');

		expect(result.speakerId).toBe('voice-clone-6915bde9cca4d3c8ecb3eaf5');
		expect(result.confirmError).toBeUndefined();
	});

	it('confirmVoiceClone returns the speakerId', async () => {
		mockJson({speakerId: 'voice-clone-6915bde9cca4d3c8ecb3eaf5'});

		const result = await client.confirmVoiceClone({
			taskId: '6915bde9cca4d3c8ecb3eaf5',
			name: 'API Voice',
			gender: 'male',
		});

		expect(captured[0]!.url).toBe('https://api.test.com/openapi/v1/voice-clone/confirm');
		expect(captured[0]!.json).toEqual({
			taskId: '6915bde9cca4d3c8ecb3eaf5',
			name: 'API Voice',
			gender: 'male',
		});
		expect(result).toEqual({speakerId: 'voice-clone-6915bde9cca4d3c8ecb3eaf5'});
	});

	it('speaker management hits the openapi speaker paths', async () => {
		mockJson({
			speakers: [],
			quota: 5,
			isLimitReached: false,
			maxSpeakers: 5,
			remainingConfirmations: 5,
		});
		mockJson({id: 'sp-1', speakerInnerId: 'voice-clone-1', name: 'API Voice'});
		mockJson({id: 'sp-1', speakerInnerId: 'voice-clone-1', name: 'Renamed'});
		mockJson({speakerId: 'sp-1'});

		await client.listVoiceCloneSpeakers();
		await client.getVoiceCloneSpeaker('sp-1');
		await client.updateVoiceCloneSpeaker('sp-1', {name: 'Renamed'});
		await client.deleteVoiceCloneSpeaker('sp-1');

		expect(captured.map((req) => [req.method, req.url])).toEqual([
			['GET', 'https://api.test.com/openapi/v1/voice-clone/speakers'],
			['GET', 'https://api.test.com/openapi/v1/voice-clone/speakers/sp-1'],
			['PUT', 'https://api.test.com/openapi/v1/voice-clone/speakers/sp-1'],
			['DELETE', 'https://api.test.com/openapi/v1/voice-clone/speakers/sp-1'],
		]);
		expect(captured[2]!.json).toEqual({name: 'Renamed'});
	});
});
