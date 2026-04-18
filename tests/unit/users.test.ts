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

describe("User methods", () => {
  const client = new ListenHubClient({
    baseURL: "https://api.test.com/api",
    accessToken: "test-token",
  });

  it("getCurrentUser sends GET /v1/users/me and returns user profile", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "user-1",
        username: "testuser",
        nickname: "Test User",
        avatar: "https://example.com/avatar.png",
        email: "test@example.com",
        createdAt: 1700000000,
        updatedAt: 1700000000,
        activeStatus: "active",
        registerSource: "email",
        provisionStatus: true,
        scopes: ["read", "write"],
      }),
    );
    const result = await client.getCurrentUser();
    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.url).toBe("https://api.test.com/api/v1/users/me");
    expect(req.method).toBe("GET");
    expect(result.id).toBe("user-1");
    expect(result.email).toBe("test@example.com");
  });

  it("getSubscription sends GET /v1/users/subscription and returns subscription info", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        subscriptionProductId: "pro",
        subscriptionStatus: "active",
        subscriptionStartedAt: 1700000000,
        subscriptionExpiresAt: 1730000000,
        usageAvailableMonthlyCredits: 100,
        usageTotalMonthlyCredits: 100,
        usageAvailablePermanentCredits: 0,
        usageTotalPermanentCredits: 0,
        usageAvailableLimitedTimeCredits: 0,
        totalAvailableCredits: 100,
        usageAudioGenerateAvailableAmount: 50,
        usageAudioGenerateUsedAmount: 50,
        resetAt: 1730000000,
        platform: "web",
        renewStatus: true,
        trialStatus: false,
        paidStatus: true,
        subscriptionPlan: {},
      }),
    );
    const result = await client.getSubscription();
    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.url).toBe("https://api.test.com/api/v1/users/subscription");
    expect(req.method).toBe("GET");
    expect(result.subscriptionProductId).toBe("pro");
    expect(result.subscriptionStatus).toBe("active");
  });
});
