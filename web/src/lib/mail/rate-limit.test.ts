// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows 5 hits in the window and rejects the 6th", () => {
    const limiter = new RateLimiter(5, 600_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(limiter.hit("1.2.3.4", t + i)).toBe(true);
    expect(limiter.hit("1.2.3.4", t + 10)).toBe(false);
  });

  it("allows again once the window has passed", () => {
    const limiter = new RateLimiter(5, 600_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) limiter.hit("ip", t);
    expect(limiter.hit("ip", t + 599_999)).toBe(false);
    expect(limiter.hit("ip", t + 600_000)).toBe(true);
  });

  it("does not count rejected hits against the next window", () => {
    const limiter = new RateLimiter(2, 1_000);
    expect(limiter.hit("ip", 0)).toBe(true);
    expect(limiter.hit("ip", 0)).toBe(true);
    for (let i = 0; i < 10; i++) expect(limiter.hit("ip", 500)).toBe(false);
    expect(limiter.hit("ip", 1_000)).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = new RateLimiter(1, 1_000);
    expect(limiter.hit("a", 0)).toBe(true);
    expect(limiter.hit("a", 0)).toBe(false);
    expect(limiter.hit("b", 0)).toBe(true);
  });

  it("forgets expired keys so memory stays bounded", () => {
    const limiter = new RateLimiter(1, 1_000);
    for (let i = 0; i < 100; i++) limiter.hit(`ip-${i}`, 0);
    expect(limiter.size).toBe(100);
    limiter.sweep(5_000);
    expect(limiter.size).toBe(0);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
