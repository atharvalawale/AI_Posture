// @vitest-environment node
import { describe, expect, it } from "vitest";
import { handleNewsletter, type Subscriber } from "./newsletter";
import { RateLimiter } from "./rate-limit";

function fakeSubscriber(fail = false) {
  const calls: string[] = [];
  const subscribe: Subscriber = async (email) => {
    calls.push(email);
    if (fail) throw new Error("provider down");
  };
  return { subscribe, calls };
}

const limiter = () => new RateLimiter(5, 600_000);

describe("handleNewsletter", () => {
  it("adds a valid address", async () => {
    const { subscribe, calls } = fakeSubscriber();
    const res = await handleNewsletter({ email: "  reader@example.com " }, "1.1.1.1", subscribe, limiter());
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(calls).toEqual(["reader@example.com"]);
  });

  it.each([
    ["an invalid email", { email: "reader@" }],
    ["a missing email", {}],
    ["a null body", null],
  ])("returns 400 for %s", async (_label, body) => {
    const { subscribe, calls } = fakeSubscriber();
    const res = await handleNewsletter(body, "1.1.1.1", subscribe, limiter());
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("pretends success on a honeypot hit and adds nothing", async () => {
    const { subscribe, calls } = fakeSubscriber();
    const res = await handleNewsletter({ email: "bot@example.com", company: "x" }, "1.1.1.1", subscribe, limiter());
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(calls).toHaveLength(0);
  });

  it("returns 502 naming hello@fiixbee.com when the provider fails", async () => {
    const { subscribe } = fakeSubscriber(true);
    const res = await handleNewsletter({ email: "reader@example.com" }, "1.1.1.1", subscribe, limiter());
    expect(res.status).toBe(502);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain("hello@fiixbee.com");
  });

  it("returns 429 on the 6th request from one address", async () => {
    const { subscribe } = fakeSubscriber();
    const l = limiter();
    for (let i = 0; i < 5; i++) await handleNewsletter({ email: `r${i}@example.com` }, "7.7.7.7", subscribe, l);
    const res = await handleNewsletter({ email: "r6@example.com" }, "7.7.7.7", subscribe, l);
    expect(res.status).toBe(429);
    expect(res.body.ok).toBe(false);
  });
});
