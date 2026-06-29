// Generate audio with seed-audio-1.0, poll for the result, and list recent tasks.
//
// Run: pnpm exec tsx examples/seed-audio.ts

import {login} from './_login.js';

const client = await login();

// --- Create task (single voice) ---
// `voices[].id` is a ListenHub speakerInnerId or a Doubao official voice_type.
// text <= 1400 chars; durationHint 1-110. `voices` and `image` are mutually exclusive.
const task = await client.createSeedAudio({
	text: '欢迎收听 ListenHub，今天我们聊聊 seed-audio 的用法。',
	voices: [{type: 'speaker', id: 'zh_female_wanwanxiaohe_moon_bigtts'}],
	audioConfig: {format: 'mp3'},
});
console.log(`Task created: ${task.taskId} (${task.status})`);

// --- Image-to-audio variant (mutually exclusive with `voices`) ---
// const imageTask = await client.createSeedAudio({
// 	text: '为这张图配一段旁白。',
// 	image: {url: 'https://example.com/scene.jpg'},
// });

// --- Poll until done ---
let detail = await client.getSeedAudioTask(task.taskId);
while (detail.status !== 'success' && detail.status !== 'failed') {
	await sleep(5_000);
	detail = await client.getSeedAudioTask(task.taskId);
	console.log(`Status: ${detail.status}`);
}

if (detail.status === 'success') {
	console.log(`Audio URL: ${detail.audioUrl}`);
	console.log(`Duration: ${detail.audioDuration}s`);
} else {
	console.error(`Seed audio generation failed: ${detail.errorMessage ?? 'unknown error'}`);
}

// --- List recent tasks ---
const list = await client.listSeedAudioTasks({page: 1, pageSize: 5});
console.log(`\nRecent seed-audio tasks:`);
for (const item of list.items) {
	console.log(`  ${item.id} ${item.status}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
