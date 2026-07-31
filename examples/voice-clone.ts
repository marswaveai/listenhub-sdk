// Clone a voice from reference audio with an API key, then speak with it.
//
// Two flows are shown: the two-step one (clone → confirm) and the one-shot one
// (`autoConfirm`, where the poll that finds the task completed also confirms it).
// Confirming is free within the tier quota; beyond it the server charges 300
// credits and only when `useCredits` is set.
//
// Run: LISTENHUB_API_KEY=lh_sk_... pnpm exec tsx examples/voice-clone.ts ./reference.mp3

import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {OpenAPIClient} from '../src/index.js';

const referencePath = process.argv[2];
if (!referencePath) {
	console.error('Usage: pnpm exec tsx examples/voice-clone.ts <reference-audio>');
	process.exit(1);
}

const client = new OpenAPIClient();
const reference = new Blob([await readFile(referencePath)]);

// 1. Create the clone task. `consentConfirmed: true` declares you hold the cloned
//    person's consent — the server rejects the request without it. 1-6 files,
//    single file max 5MB, total max 20MB. Language: zh | en | ja.
const {taskId} = await client.createVoiceClone({
	audioFiles: [reference],
	audioFilenames: [basename(referencePath)],
	language: 'en',
	consentConfirmed: true,
});
console.log(`Clone task created: ${taskId}`);

// 2. Poll. Three terminal shapes to tell apart: failed, cloned-but-unconfirmed,
//    and confirmed.
let task = await client.getVoiceCloneTask(taskId);
while (task.status === 'pending' || task.status === 'processing') {
	await sleep(5_000);
	task = await client.getVoiceCloneTask(taskId);
	console.log(`Status: ${task.status}`);
}

if (task.status === 'failed') {
	console.error(`Cloning failed (${task.errorCode}): ${task.errorMessage}`);
	process.exit(1);
}

console.log(`Preview of the temporary voice: ${task.demoAudioUrl}`);

// 3. Confirm the task into a reusable private speaker.
const {speakerId} = await client.confirmVoiceClone({
	taskId,
	name: 'My API Voice',
	gender: 'female',
	// useCredits: true, // authorize the 300-credit charge once the quota is used up
});
console.log(`Confirmed speaker: ${speakerId}`);

// --- One-shot variant ---
// const oneShot = await client.createVoiceClone({
// 	audioFiles: [reference],
// 	language: 'ja',
// 	consentConfirmed: true,
// 	autoConfirm: true,
// 	name: 'My API Voice',
// 	gender: 'female',
// 	useCredits: true,
// });
// Poll as above; the first poll that sees the task completed confirms it and
// returns `speakerId`. If confirmation itself fails (no credits, quota full, …)
// the same response carries `confirmError` instead — the clone is still there.

// 4. The speakerId works on the existing TTS endpoints.
const speech = await client.speech({
	scripts: [{content: 'This sentence is spoken by my own cloned voice.', speakerId}],
});
console.log(`Audio URL: ${speech.audioUrl}`);

// 5. Manage private speakers. Deleting frees one slot against the tier limit.
const speakers = await client.listVoiceCloneSpeakers();
console.log(
	`Private speakers: ${speakers.speakers.length}/${speakers.maxSpeakers}, ` +
		`${speakers.remainingConfirmations} confirmation(s) left this period`,
);

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
