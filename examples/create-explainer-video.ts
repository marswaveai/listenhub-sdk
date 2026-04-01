// Create an explainer video from a URL.
//
// Run: pnpm exec tsx examples/create-explainer-video.ts

import type {ProcessStatus} from '../src/index.js';
import {login} from './_login.js';

const client = await login();

const speakers = await client.listSpeakers({language: 'en'});
const narrator = speakers.items[0]!;

const {episodeId} = await client.createExplainerVideo({
	query: 'How does CRISPR gene editing work?',
	sources: [{type: 'url', uri: 'https://en.wikipedia.org/wiki/CRISPR_gene_editing'}],
	imageConfig: {size: '2K', aspectRatio: '16:9'},
	template: {
		type: 'storybook',
		mode: 'info',
		speakers: [narrator.speakerInnerId],
		language: 'en',
		size: '2K',
		aspectRatio: '16:9',
	},
});
console.log(`Created explainer video: ${episodeId}`);

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
	console.log(`Video: ${detail.topicDetail.video.data.videoUrl}`);
	console.log(`Pages: ${detail.topicDetail.pages.data.length}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
