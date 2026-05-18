// OpenAPI Key usage — no OAuth required, just set LISTENHUB_API_KEY.
//
// Run: LISTENHUB_API_KEY=lh_sk_... pnpm exec tsx examples/openapi-basic.ts

import {OpenAPIClient, ListenHubError} from '../src/index.js';

const client = new OpenAPIClient();

// 1. List available speakers
const {items: speakers} = await client.listSpeakers({language: 'en'});
console.log(`Available speakers: ${speakers.map((s) => s.name).join(', ')}`);

// 2. Create a flow speech
const speaker = speakers[0]!;
const {episodeId} = await client.createFlowSpeech({
	sources: [{type: 'url', content: 'https://en.wikipedia.org/wiki/Mars'}],
	speakers: [{speakerId: speaker.speakerId}],
	language: 'en',
});
console.log(`Created flow speech: ${episodeId}`);

// 3. Poll until done
let detail = await client.getFlowSpeech(episodeId);
while (detail.processStatus === 'pending') {
	await sleep(3000);
	detail = await client.getFlowSpeech(episodeId);
	console.log(`Status: ${detail.processStatus}`);
}

if (detail.audioUrl) {
	console.log(`Audio: ${detail.audioUrl}`);
	console.log(`Title: ${detail.title}`);
}

// 4. Check remaining credits
const sub = await client.getSubscription();
console.log(`Credits remaining: ${sub.totalAvailableCredits}`);

// Error handling
try {
	await client.getFlowSpeech('nonexistent-id');
} catch (err) {
	if (err instanceof ListenHubError) {
		console.log(`Expected error: [${err.status}] ${err.message}`);
	}
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
