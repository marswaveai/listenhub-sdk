// Create a duo podcast from a URL and poll until complete.
//
// Run: LISTENHUB_ACCESS_TOKEN=xxx npx tsx examples/create-podcast.ts

import {ListenHubClient, type ProcessStatus} from '@marswave/listenhub-sdk';

const client = new ListenHubClient({
	accessToken: process.env['LISTENHUB_ACCESS_TOKEN'],
});

// 1. Pick speakers
const speakers = await client.listSpeakers({language: 'en'});
const [host, guest] = speakers.items.slice(0, 2);
console.log(`Speakers: ${host.name}, ${guest.name}`);

// 2. Create podcast
const {episodeId} = await client.createPodcast({
	type: 'podcast-duo',
	query: 'Explain how transformers work in LLMs',
	sources: [
		{type: 'url', uri: 'https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)'},
	],
	template: {
		type: 'podcast',
		mode: 'deep',
		speakers: [host.speakerInnerId, guest.speakerInnerId],
		language: 'en',
	},
});
console.log(`Created podcast: ${episodeId}`);

// 3. Poll until done
let status: ProcessStatus = 'pending';
while (status === 'pending') {
	await sleep(5000);
	const detail = await client.getCreation(episodeId);
	status = detail.processStatus;
	console.log(`Status: ${status}`);
}

if (status === 'success') {
	const detail = await client.getCreation(episodeId);
	console.log(`Title: ${detail.topicDetail.title.data}`);
	console.log(`Audio: ${detail.topicDetail.audio.data.audioUrl}`);
} else {
	console.error('Generation failed');
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
