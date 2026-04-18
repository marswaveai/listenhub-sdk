import express from "express";

export function createMockServer() {
  const app = express();
  app.use(express.json());

  // Standard success
  app.get("/api/v1/things", (_req, res) => {
    res.json({ code: 0, message: "ok", data: { itemCount: 3, items: [1, 2, 3] } });
  });

  // POST with body echo
  app.post("/api/v1/echo", (req, res) => {
    res.json({ code: 0, message: "ok", data: req.body });
  });

  // 204 No Content
  app.delete("/api/v1/things/:id", (_req, res) => {
    res.status(204).end();
  });

  // Backend API error
  app.get("/api/v1/error", (_req, res) => {
    res.json({
      code: 40001,
      message: "Something went wrong",
      request_id: "req_123",
    });
  });

  // Gateway HTML error
  app.get("/api/v1/gateway-error", (_req, res) => {
    res.status(502).type("html").send("<html><head><title>502 Bad Gateway</title></head></html>");
  });

  // 429 rate limit
  let rateLimitCalls = 0;
  app.get("/api/v1/rate-limited", (_req, res) => {
    rateLimitCalls++;
    if (rateLimitCalls <= 1) {
      res.status(429).set("Retry-After", "0").json({ code: 42900, message: "rate limited" });
    } else {
      rateLimitCalls = 0;
      res.json({ code: 0, message: "ok", data: { ok: true } });
    }
  });

  // 401 Unauthorized
  app.get("/api/v1/protected", (req, res) => {
    const auth = req.headers.authorization;
    if (auth === "Bearer valid_token") {
      res.json({ code: 0, message: "ok", data: { user: "test" } });
    } else {
      res.status(401).json({ code: 40100, message: "Unauthorized" });
    }
  });

  // Auth token endpoint (refresh)
  app.post("/api/v1/auth/token", (req, res) => {
    const body = req.body;
    if (body?.grantType === "refresh_token" && body?.refreshToken === "valid_rt") {
      res.json({
        code: 0,
        message: "ok",
        data: { accessToken: "new_at", refreshToken: "new_rt", expiresIn: 3600 },
      });
    } else {
      res.status(401).json({ code: 40100, message: "Invalid refresh token" });
    }
  });

  return app;
}
