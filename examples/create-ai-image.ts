// Generate an AI image from a text prompt.
//
// Run: pnpm exec tsx examples/create-ai-image.ts

import { login } from "./_login.js";

const client = await login();

const { imageId } = await client.createAIImage({
  prompt: "A cozy Japanese coffee shop on a rainy afternoon, warm lighting, watercolor style",
  aspectRatio: "16:9",
  imageSize: "2K",
  model: "gemini-3-pro-image-preview",
});
console.log(`Created image: ${imageId}`);

// Poll until done
let image = await client.getAIImage(imageId);
while (image.status === "pending") {
  await sleep(3000);
  image = await client.getAIImage(imageId);
  console.log(`Status: ${image.status}`);
}

if (image.imageUrl) {
  console.log(`Image: ${image.imageUrl}`);
} else {
  console.error("Generation failed");
}

// List recent AI images
const images = await client.listAIImages({ page: 1, pageSize: 5 });
console.log(`\nRecent AI images (${images.pagination.total} total):`);
for (const item of images.items) {
  console.log(`  ${item.prompt.slice(0, 50)}... — ${item.status}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
