// Generate an AI image from a text prompt.
//
// Run: pnpm exec tsx examples/create-ai-image.ts

import {login} from './_login.js';

const client = await login();

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
