import { describe, it, expect } from "vitest";
import { ListenHubClient } from "../../src/index";
import { ListenHubError } from "../../src/errors";

const API_URL = process.env.LISTENHUB_API_URL;
const ACCESS_TOKEN = process.env.LISTENHUB_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.LISTENHUB_REFRESH_TOKEN;

describe.skipIf(!API_URL)("E2E: Client basic requests", () => {
  it("reaches the API via public endpoint", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    const result = await client.connectInit({ callbackPort: 19526 });
    expect(result.sessionId).toBeDefined();
    expect(result.authUrl).toBeDefined();
  });

  it("throws ListenHubError on invalid endpoint", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    try {
      await client.api.get("v1/this-endpoint-does-not-exist").json();
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError);
      expect((e as ListenHubError).status).toBeGreaterThanOrEqual(400);
    }
  });
});

describe.skipIf(!API_URL || !ACCESS_TOKEN)("E2E: Authenticated requests", () => {
  it("calls a protected endpoint with access token", async () => {
    const client = new ListenHubClient({
      baseURL: API_URL,
      accessToken: ACCESS_TOKEN,
    });
    const result = await client.api.get("v1/users/me").json<{ id: string }>();
    expect(result.id).toBeDefined();
  });

  it("throws 401 without access token", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    try {
      await client.api.get("v1/users/me").json();
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError);
      expect((e as ListenHubError).status).toBe(401);
    }
  });
});

describe.skipIf(!API_URL || !REFRESH_TOKEN)("E2E: Token refresh", () => {
  it("refreshes token and gets new access + refresh tokens", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    const result = await client.refresh({ refreshToken: REFRESH_TOKEN! });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
  });
});
