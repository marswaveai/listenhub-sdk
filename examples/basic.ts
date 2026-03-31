// Basic API usage — demonstrates core SDK features.
//
// Prerequisites: pnpm install
// Run: LISTENHUB_ACCESS_TOKEN=xxx npx tsx examples/basic.ts

import {ListenHubClient, ListenHubError} from '@marswave/listenhub-sdk';

const client = new ListenHubClient({
	accessToken: process.env['LISTENHUB_ACCESS_TOKEN'],
});

// Checkin
try {
	const checkin = await client.checkinSubmit();
	console.log('Checked in:', checkin.checkinDate, `+${checkin.rewardCredits} credits`);
} catch (err) {
	if (err instanceof ListenHubError) {
		console.log('Checkin:', err.code, err.message);
	} else throw err;
}

// Checkin status
const status = await client.checkinStatus();
console.log('Status:', status);

// API key
const {key} = await client.getApiKey();
console.log('API key:', key);
