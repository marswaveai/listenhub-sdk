import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ListenHubClient } from "../../src/listenhub";

const mockFetch = vi.fn();

beforeEach(() => vi.stubGlobal("fetch", mockFetch));
afterEach(() => vi.restoreAllMocks());

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ code: 0, message: "Success", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Speaker methods", () => {
  const client = new ListenHubClient({
    baseURL: "https://api.test.com/api",
    accessToken: "test-token",
  });

  it("listSpeakers sends GET /v1/settings/speakers with language param", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: "spk-1",
            name: "Alice",
            speakerInnerId: "alice-en",
            personality: "calm",
            demoAudioUrl: "https://example.com/demo.mp3",
            gender: "female",
            accessType: "public",
            weight: 1,
          },
        ],
      }),
    );
    const result = await client.listSpeakers({ language: "en" });
    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("GET");
    expect(req.url).toContain("v1/settings/speakers");
    expect(req.url).toContain("language=en");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alice");
  });
});
