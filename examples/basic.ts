// Basic API usage — demonstrates core SDK features.
//
// Run: pnpm exec tsx examples/basic.ts

import {ListenHubError} from '../src/index.js';
import {login} from './_login.js';

const client = await login();

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
