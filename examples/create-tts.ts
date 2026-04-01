// Create a text-to-speech audio from plain text.
//
// Run: LISTENHUB_ACCESS_TOKEN=xxx npx tsx examples/create-tts.ts

import {ListenHubClient, type ProcessStatus} from '@marswave/listenhub-sdk';

const client = new ListenHubClient({
	accessToken: process.env['LISTENHUB_ACCESS_TOKEN'],
});

const speakers = await client.listSpeakers({language: 'zh'});
const speaker = speakers.items[0];
console.log(`Speaker: ${speaker.name}`);

const {episodeId} = await client.createTTS({
	sources: [
		{
			type: 'text',
			content:
				'人工智能正在改变我们的生活方式。从智能助手到自动驾驶，AI 技术已经深入到日常的方方面面。',
		},
	],
	template: {
		type: 'flowspeech',
		mode: 'smart',
		speakers: [speaker.speakerInnerId],
		language: 'zh',
	},
});
console.log(`Created TTS: ${episodeId}`);

let status: ProcessStatus = 'pending';
while (status === 'pending') {
	await sleep(3000);
	const detail = await client.getCreation(episodeId);
	status = detail.processStatus;
	console.log(`Status: ${status}`);
}

if (status === 'success') {
	const detail = await client.getCreation(episodeId);
	console.log(`Audio: ${detail.topicDetail.audio.data.audioUrl}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
