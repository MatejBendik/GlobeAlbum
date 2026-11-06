import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "../src/lib/http";
afterEach(() => vi.unstubAllEnvs());
describe("upload request origins", () => {
  it("accepts the same app through localhost when local config uses the loopback IP", () => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/uploads", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects an unrelated origin even when a forwarded host matches it", () => {
    vi.stubEnv("APP_ORIGIN", "https://globealbum.example");
    expect(() =>
      assertSameOrigin(
        new Request("https://globealbum.example/api/uploads", {
          headers: {
            origin: "https://evil.example",
            "x-forwarded-host": "evil.example",
          },
        }),
      ),
    ).toThrow("origin");
  });
});

describe("strict production and local origin boundaries", () => {
  it.each([
    "http://localhost:3001",
    "https://localhost:3000",
    "http://localhost.evil.test:3000",
    "null",
    "not-a-url",
  ])("rejects %s", (origin) => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3000");
    expect(() =>
      assertSameOrigin(
        new Request("http://127.0.0.1:3000/api/uploads", {
          headers: { origin },
        }),
      ),
    ).toThrow();
  });
  it("does not enable local aliases for a hosted app", () => {
    vi.stubEnv("APP_ORIGIN", "https://globealbum.example");
    expect(() =>
      assertSameOrigin(
        new Request("https://globealbum.example/api/uploads", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toThrow();
  });
});
