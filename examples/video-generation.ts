// Generate a video with SeeDance2.0, poll for result, and list recent tasks.
//
// Run: pnpm exec tsx examples/video-generation.ts

import {login} from './_login.js';

const client = await login();

// --- Estimate credits ---
const estimate = await client.estimateVideoGenerationCredits({
	model: 'doubao-seedance-2-fast',
	resolution: '720p',
	duration: 5,
});
console.log(`Estimated credits: ${estimate.credits}`);

// --- Create task ---
const task = await client.createVideoGeneration({
	model: 'doubao-seedance-2-fast',
	content: [
		{type: 'text', text: '一只猫在花园里奔跑'},
		{type: 'image_url', image_url: {url: 'https://example.com/cat.jpg'}, role: 'first_frame'},
	],
	resolution: '720p',
	duration: 5,
});
console.log(`Task created: ${task.taskId} (${task.status})`);

// --- Poll until done ---
let detail = await client.getVideoGenerationTask(task.taskId);
while (detail.status !== 'success' && detail.status !== 'failed') {
	await sleep(10_000);
	detail = await client.getVideoGenerationTask(task.taskId);
	console.log(`Status: ${detail.status}`);
}

if (detail.status === 'success') {
	console.log(`Video URL: ${detail.videoUrl}`);
	console.log(`Seed: ${detail.seed}`);
} else {
	console.error('Video generation failed');
}

// --- List recent tasks ---
const list = await client.listVideoGenerationTasks({page: 1, pageSize: 5});
console.log(`\nRecent video tasks:`);
for (const item of list.items) {
	console.log(`  ${item.id} ${item.status} ${item.params.resolution}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
