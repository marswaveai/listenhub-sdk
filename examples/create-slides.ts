// Create a slide deck presentation.
//
// Run: pnpm exec tsx examples/create-slides.ts

import type {ProcessStatus} from '../src/index.js';
import {login} from './_login.js';

const client = await login();

const speakers = await client.listSpeakers({language: 'en'});
const narrator = speakers.items[0]!;

const {episodeId} = await client.createSlides({
	query: 'Introduction to TypeScript for JavaScript developers',
	imageConfig: {size: '2K', aspectRatio: '16:9'},
	template: {
		type: 'storybook',
		mode: 'slides',
		speakers: [narrator.speakerInnerId],
		language: 'en',
		size: '2K',
		aspectRatio: '16:9',
		pageCount: 10,
	},
});
console.log(`Created slides: ${episodeId}`);

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
	console.log(`Slides: ${detail.topicDetail.slides.data.slidesUrl}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
