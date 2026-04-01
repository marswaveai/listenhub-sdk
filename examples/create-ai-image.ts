// Generate an AI image from a text prompt.
//
// Run: LISTENHUB_ACCESS_TOKEN=xxx npx tsx examples/create-ai-image.ts

import {ListenHubClient} from '@marswave/listenhub-sdk';

const client = new ListenHubClient({
	accessToken: process.env['LISTENHUB_ACCESS_TOKEN'],
});

const {imageId} = await client.createAIImage({
	prompt: 'A cozy Japanese coffee shop on a rainy afternoon, warm lighting, watercolor style',
	aspectRatio: '16:9',
	imageSize: '2K',
	model: 'gemini-3-pro-image-preview',
});
console.log(`Created image: ${imageId}`);

// List recent AI images
const images = await client.listAIImages({page: 1, pageSize: 5});
console.log(`Total AI images: ${images.pagination.total}`);
for (const item of images.items) {
	console.log(`  ${item.title} — ${item.processStatus}`);
}
