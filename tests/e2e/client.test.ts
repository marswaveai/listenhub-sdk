import { describe, it, expect } from "vitest";
import { ListenHubClient } from "../../src/index";
import { ListenHubError } from "../../src/types/common";

const API_URL = process.env.LISTENHUB_API_URL;
const ACCESS_TOKEN = process.env.LISTENHUB_ACCESS_TOKEN;

describe.skipIf(!API_URL)("E2E: Client basic requests", () => {
  it("reaches the API via public endpoint", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    const result = await client.request<{ sessionId: string; authUrl: string }>(
      "POST",
      "/v1/auth/connect/init",
      { body: { callbackPort: 19526 } },
    );
    expect(result.sessionId).toBeDefined();
    console.log(result);
    expect(result.authUrl).toBeDefined();
  });

  it("throws ListenHubError on invalid endpoint", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    try {
      await client.request("GET", "/v1/this-endpoint-does-not-exist");
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ListenHubError);
      expect((e as ListenHubError).status).toBeGreaterThanOrEqual(400);
    }
  });

  it("response keys are camelCased", async () => {
    const client = new ListenHubClient({ baseURL: API_URL });
    // connect/init returns snake_case from backend (session_id, auth_url) — SDK should camelCase them
    const result = await client.request<Record<string, unknown>>(
      "POST",
      "/v1/auth/connect/init",
      { body: { callbackPort: 19526 } },
    );
    for (const key of Object.keys(result as object)) {
      expect(key).not.toMatch(/_[a-z]/);
    }
  });
});

describe.skipIf(!API_URL || !ACCESS_TOKEN)(
  "E2E: Authenticated requests",
  () => {
    it("calls a protected endpoint with access token", async () => {
      const client = new ListenHubClient({
        baseURL: API_URL,
        accessToken: ACCESS_TOKEN,
      });
      const result = await client.request<{ id: string }>(
        "GET",
        "/v1/users/me",
      );
      expect(result.id).toBeDefined();
    });

    it("throws 401 without access token", async () => {
      const client = new ListenHubClient({ baseURL: API_URL });
      try {
        await client.request("GET", "/v1/users/me", { skipAutoRefresh: true });
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ListenHubError);
        expect((e as ListenHubError).status).toBe(401);
      }
    });

    it("onRequest hook fires with real request", async () => {
      let capturedUrl = "";
      const client = new ListenHubClient({
        baseURL: API_URL,
        accessToken: ACCESS_TOKEN,
        onRequest: (req) => {
          capturedUrl = req.url;
        },
      });
      await client.request("GET", "/v1/users/me");
      expect(capturedUrl).toContain("/v1/users/me");
    });

    it("onResponse hook fires with real response", async () => {
      let capturedStatus = 0;
      const client = new ListenHubClient({
        baseURL: API_URL,
        accessToken: ACCESS_TOKEN,
        onResponse: (res) => {
          capturedStatus = res.status;
        },
      });
      await client.request("GET", "/v1/users/me");
      expect(capturedStatus).toBe(200);
    });
  },
);
