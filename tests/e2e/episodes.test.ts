import {describe, it, expect} from 'vitest';
import {ListenHubClient} from '../../src/index';

const API_URL = process.env.LISTENHUB_API_URL;
const ACCESS_TOKEN = process.env.LISTENHUB_ACCESS_TOKEN;

describe.skipIf(!API_URL || !ACCESS_TOKEN)('E2E: Core endpoints', () => {
	const client = new ListenHubClient({
		baseURL: API_URL,
		accessToken: ACCESS_TOKEN,
	});

	it('listEpisodes() returns items and pagination', async () => {
		const result = await client.listEpisodes({page: 1, pageSize: 5});
		console.log(result);
		expect(result).toHaveProperty('items');
		expect(Array.isArray(result.items)).toBe(true);
		expect(result).toHaveProperty('pagination');
		expect(result.pagination).toHaveProperty('page');
		expect(result.pagination).toHaveProperty('pageSize');
	});

	it('getCurrentUser() returns user with id and email', async () => {
		const result = await client.getCurrentUser();
		expect(typeof result.id).toBe('string');
		expect(typeof result.email).toBe('string');
		expect(result.id.length).toBeGreaterThan(0);
	});

	it('getSubscription() returns subscriptionStatus', async () => {
		const result = await client.getSubscription();
		expect(typeof result.subscriptionStatus).toBe('string');
		expect(typeof result.totalAvailableCredits).toBe('number');
	});

	it('listSpeakers() returns non-empty items', async () => {
		const result = await client.listSpeakers();
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items[0]).toHaveProperty('speakerInnerId');
		expect(result.items[0]).toHaveProperty('name');
	});

	it('getSettings() returns items array', async () => {
		const result = await client.getSettings();
		expect(Array.isArray(result.items)).toBe(true);
	});
});
