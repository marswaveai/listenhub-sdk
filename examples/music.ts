// Generate music from a text prompt, or create a cover from an audio reference.
//
// Run: pnpm exec tsx examples/music.ts

import {login} from './_login.js';

const client = await login();

// --- Generate ---
const generate = await client.createMusicGenerate({
	prompt: 'Upbeat lo-fi hip hop beat with jazzy piano chords',
	style: 'lo-fi',
	title: 'Late Night Study',
});
console.log(`Generate task: ${generate.taskId} (${generate.status})`);

// Poll until done
let task = await client.getMusicTask(generate.taskId);
while (task.status !== 'success' && task.status !== 'failed') {
	await sleep(10_000);
	task = await client.getMusicTask(generate.taskId);
	console.log(`Status: ${task.status}`);
}

if (task.status === 'success') {
	for (const track of task.tracks) {
		console.log(`  ${track.title} — ${track.audioUrl}`);
	}
} else {
	console.error(`Failed: ${task.errorMessage}`);
}

// --- List ---
const list = await client.listMusicTasks({page: 1, pageSize: 5});
console.log(`\nRecent music tasks:`);
for (const item of list.items) {
	console.log(`  ${item.id} ${item.taskType} ${item.status}`);
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
