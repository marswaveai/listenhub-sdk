import {ListenHubClient, OpenAPIClient} from '../src/index.js';

// The same request shape works with OAuth and OpenAPI authentication.
async function generate(client: ListenHubClient | OpenAPIClient) {
	const draft = await client.createVideoGeneration({
		model: 'doubao-seedance-2-5',
		content: [
			{type: 'text', text: 'Follow the rhythm of the reference music'},
			{
				type: 'audio_url',
				audio_url: {url: 'https://example.com/music.wav', duration: 5, size: 800000},
				role: 'reference_audio',
			},
		],
		resolution: '480p',
		ratio: '16:9',
		duration: 5,
		draft: true,
		requestId: crypto.randomUUID(),
	});
	let task = await client.getVideoGenerationTask(draft.taskId);
	while (task.status !== 'success' && task.status !== 'failed') {
		await new Promise((resolve) => setTimeout(resolve, 10000));
		task = await client.getVideoGenerationTask(draft.taskId);
	}
	if (task.status === 'failed')
		throw new Error(`Draft ${task.id} failed; no final task was created`);
	// Separate charge; retry this exact request ID after a network failure.
	const finalRequest = {
		model: 'doubao-seedance-2-5' as const,
		draftTaskId: task.id,
		requestId: crypto.randomUUID(),
	};
	const final = await client.createVideoGeneration(finalRequest);
	return {draftTaskId: task.id, finalTaskId: final.taskId};
}

export {generate};
