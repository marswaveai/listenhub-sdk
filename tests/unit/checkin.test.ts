import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ListenHubClient } from "../../src/listenhub";

const mockFetch = vi.fn();

beforeEach(() => vi.stubGlobal("fetch", mockFetch));
afterEach(() => vi.restoreAllMocks());

function jsonResponse(data: unknown, code = 0) {
  return new Response(
    JSON.stringify({
      code,
      message: code === 0 ? "Success" : "Already checked in today",
      data,
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

async function capturedRequest(index = 0): Promise<{ url: string; method: string; body: unknown }> {
  const req: Request = mockFetch.mock.calls[index][0];
  return {
    url: req.url,
    method: req.method,
    body: (req as any)._bodyForTest,
  };
}

function mockJsonResponse(data: unknown, code = 0) {
  mockFetch.mockImplementationOnce(async (req: Request) => {
    const text = await req.text();
    (req as any)._bodyForTest = text ? JSON.parse(text) : undefined;
    return jsonResponse(data, code);
  });
}

describe("Checkin methods", () => {
  const client = new ListenHubClient({
    baseURL: "https://api.test.com/api",
    accessToken: "test-token",
  });

  describe("checkinSubmit()", () => {
    it("sends POST /v1/checkin with platform listenhub and returns result", async () => {
      mockJsonResponse({ checkinDate: "2026-03-29", rewardCredits: 10 });

      const result = await client.checkinSubmit();

      expect(result).toEqual({ checkinDate: "2026-03-29", rewardCredits: 10 });
      const req = await capturedRequest();
      expect(req.url).toBe("https://api.test.com/api/v1/checkin");
      expect(req.method).toBe("POST");
      expect(req.body).toEqual({ platform: "listenhub" });
    });

    it("throws ListenHubError with code 28101 on duplicate checkin", async () => {
      mockJsonResponse(null, 28101);

      await expect(client.checkinSubmit()).rejects.toMatchObject({
        code: "28101",
      });
    });
  });

  describe("checkinStatus()", () => {
    it("sends GET /v1/checkin/status and returns status", async () => {
      mockJsonResponse({
        status: "checked_in",
        hasCheckedInToday: true,
        lastCheckinTime: 1743235200000,
        monthlyCheckinCount: 15,
      });

      const result = await client.checkinStatus();

      expect(result).toEqual({
        status: "checked_in",
        hasCheckedInToday: true,
        lastCheckinTime: 1743235200000,
        monthlyCheckinCount: 15,
      });
      const req = await capturedRequest();
      expect(req.url).toBe("https://api.test.com/api/v1/checkin/status");
      expect(req.method).toBe("GET");
    });
  });
});
