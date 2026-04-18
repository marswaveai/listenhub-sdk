// Shared OAuth login helper for examples.
// Opens browser, waits for callback, returns an authenticated client.

import * as http from 'node:http';
import {ListenHubClient} from '../src/index.js';

export async function login(): Promise<ListenHubClient> {
	const client = new ListenHubClient();

	const {port, codePromise, server} = await startCallbackServer();
	const {authUrl, sessionId} = await client.connectInit({callbackPort: port});
	const open = (await import('open')).default;
	await open(authUrl);
	console.log('Opened browser for login...');

	const code = await codePromise;
	const tokens = await client.connectToken({sessionId, code});
	server.close();

	console.log('Logged in successfully.\n');

	return new ListenHubClient({accessToken: tokens.accessToken});
}

function startCallbackServer(): Promise<{
	port: number;
	codePromise: Promise<string>;
	server: http.Server;
}> {
	return new Promise((resolve) => {
		let resolveCode!: (code: string) => void;
		const codePromise = new Promise<string>((r) => (resolveCode = r));

		const server = http.createServer((req, res) => {
			const code = new URL(req.url!, 'http://localhost').searchParams.get('code');
			if (code) {
				res.writeHead(200, {'Content-Type': 'text/html'});
				res.end('<h1>Login successful! You can close this tab.</h1>');
				resolveCode(code);
			} else {
				res.writeHead(400).end('Missing code');
			}
		});

		server.listen(0, '127.0.0.1', () => {
			const addr = server.address() as {port: number};
			resolve({port: addr.port, codePromise, server});
		});
	});
}
