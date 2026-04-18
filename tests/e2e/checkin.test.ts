import { describe, it, expect } from "vitest";
import { ListenHubClient } from "../../src/index";
import { ListenHubError } from "../../src/errors";

const API_URL = process.env.LISTENHUB_API_URL;
const ACCESS_TOKEN = process.env.LISTENHUB_ACCESS_TOKEN;

describe.skipIf(!API_URL || !ACCESS_TOKEN)("E2E: Checkin Resource", () => {
  const client = new ListenHubClient({
    baseURL: API_URL,
    accessToken: ACCESS_TOKEN,
  });

  it("checkinStatus() returns current check-in status", async () => {
    const result = await client.checkinStatus();

    expect(result).toHaveProperty("status");
    expect(["checked_in", "not_checked_in"]).toContain(result.status);
    expect(typeof result.hasCheckedInToday).toBe("boolean");
    expect(typeof result.lastCheckinTime).toBe("number");
    expect(typeof result.monthlyCheckinCount).toBe("number");
  });

  it("checkinSubmit() performs daily check-in or returns duplicate error", async () => {
    try {
      const result = await client.checkinSubmit();

      // First check-in of the day succeeds
      expect(result.checkinDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof result.rewardCredits).toBe("number");
      expect(result.rewardCredits).toBeGreaterThan(0);
    } catch (e) {
      // Already checked in today — expect 28101
      expect(e).toBeInstanceOf(ListenHubError);
      expect((e as ListenHubError).code).toBe("28101");
    }
  });
});
