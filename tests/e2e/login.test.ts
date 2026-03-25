/**
 * Interactive login for E2E testing.
 *
 * Usage:
 *   pnpm test:login
 *
 * Opens a browser for you to log in, then saves the tokens
 * to .env.staging so subsequent `pnpm test:e2e` runs can use them.
 */
import {it} from 'vitest';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import getPort from 'get-port';
import open from 'open';
import {ListenHubClient} from '../../src/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.resolve(__dirname, '../../.env.staging');
const API_URL = process.env.LISTENHUB_API_URL || 'https://api.listenhub.ai/api';

it('interactive login — opens browser, saves token to .env.staging', async () => {
	const port = await getPort();
	const client = new ListenHubClient({baseURL: API_URL});

	// 1. Init OAuth flow
	const {sessionId, authUrl} = await client.connectInit({
		callbackPort: port,
	});

	// 2. Wait for OAuth callback
	let server: http.Server | undefined;
	try {
		const code = await new Promise<string>((resolve, reject) => {
			server = http.createServer((req, res) => {
				const url = new URL(req.url!, `http://localhost:${port}`);
				const authCode = url.searchParams.get('code');
				if (authCode) {
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.end(
						'<html><body><h1>Login successful!</h1><p>You can close this tab.</p></body></html>',
					);
					server!.close();
					resolve(authCode);
				} else {
					res.writeHead(400);
					res.end('Missing code parameter');
				}
			});
			server.listen(port, () => {
				console.log(`\n  Callback server listening on port ${port}`);
				console.log(`  Opening browser: ${authUrl}\n`);
				open(authUrl).catch(reject);
			});
			server.on('error', reject);
			setTimeout(() => {
				server!.close();
				reject(new Error('Login timed out after 120s'));
			}, 120_000);
		});

		// 3. Exchange code for tokens
		const tokens = await client.connectToken({sessionId, code});

		console.log('\n  Login successful!');
		console.log(`  accessToken: ${tokens.accessToken.slice(0, 20)}...`);
		console.log(`  refreshToken: ${tokens.refreshToken.slice(0, 20)}...`);

		// 4. Write tokens to .env.staging
		let envContent = '';
		try {
			envContent = fs.readFileSync(ENV_FILE, 'utf-8');
		} catch {
			envContent = `LISTENHUB_API_URL=${API_URL}\nLISTENHUB_ACCESS_TOKEN=\nLISTENHUB_REFRESH_TOKEN=\n`;
		}

		const updates: [RegExp, string][] = [
			[/LISTENHUB_ACCESS_TOKEN=.*/, `LISTENHUB_ACCESS_TOKEN=${tokens.accessToken}`],
			[/LISTENHUB_REFRESH_TOKEN=.*/, `LISTENHUB_REFRESH_TOKEN=${tokens.refreshToken}`],
		];

		for (const [pattern, replacement] of updates) {
			if (pattern.test(envContent)) {
				envContent = envContent.replace(pattern, replacement);
			} else {
				envContent += `\n${replacement}\n`;
			}
		}

		fs.writeFileSync(ENV_FILE, envContent);
		console.log('  Tokens saved to .env.staging');
		console.log('  Now run: pnpm test:e2e');
	} finally {
		server?.close();
	}
}, 120_000);
