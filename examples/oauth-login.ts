// OAuth login flow — opens browser, receives callback, prints tokens.
//
// Prerequisites: pnpm install && pnpm add -D open
// Run: npx tsx examples/oauth-login.ts

import * as http from "node:http";
import { ListenHubClient } from "../src/index.js";

const client = new ListenHubClient();

// 1. Start a temporary server to receive the OAuth callback
const { port, codePromise, server } = await startCallbackServer();

// 2. Get the auth URL and open it in the browser
const { authUrl, sessionId } = await client.connectInit({ callbackPort: port });
const open = (await import("open")).default;
await open(authUrl);
console.log("Opened browser for login...");

// 3. Wait for the user to authorize, then exchange the code for tokens
const code = await codePromise;
const tokens = await client.connectToken({ sessionId, code });
server.close();

console.log("Login successful!");
console.log("Access token:", tokens.accessToken.slice(0, 20) + "...");
console.log("Refresh token:", tokens.refreshToken.slice(0, 20) + "...");
console.log("Expires in:", tokens.expiresIn, "seconds");

// --- Helper ---

function startCallbackServer(): Promise<{
  port: number;
  codePromise: Promise<string>;
  server: http.Server;
}> {
  return new Promise((resolve) => {
    let resolveCode!: (code: string) => void;
    const codePromise = new Promise<string>((r) => (resolveCode = r));

    const server = http.createServer((req, res) => {
      const code = new URL(req.url!, "http://localhost").searchParams.get("code");
      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Login successful! you can close this tab.</h1>");
        resolveCode(code);
      } else {
        res.writeHead(400).end("Missing code");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ port: addr.port, codePromise, server });
    });
  });
}
