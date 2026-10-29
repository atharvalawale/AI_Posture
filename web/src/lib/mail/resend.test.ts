// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mailSenderFromEnv, resendSender, resendSubscriber, subscriberFromEnv } from "./resend";

const msg = { to: "hello@fiixbee.com", replyTo: "asha@example.com", subject: "New enquiry", text: "Hello" };

type Call = { url: string; body: Record<string, unknown> };

function stubFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : {} });
      const next = responses.shift() ?? { status: 500, body: { message: "unexpected call" } };
      return new Response(JSON.stringify(next.body), {
        status: next.status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("mailSenderFromEnv", () => {
  it("fails every send when RESEND_API_KEY is missing", async () => {
    await expect(mailSenderFromEnv({})(msg)).rejects.toThrow(/RESEND_API_KEY/);
  });
});

describe("subscriberFromEnv", () => {
  it("fails when RESEND_API_KEY is missing", async () => {
    await expect(subscriberFromEnv({ RESEND_AUDIENCE_ID: "seg" })("a@example.com")).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("fails when RESEND_AUDIENCE_ID is missing", async () => {
    await expect(subscriberFromEnv({ RESEND_API_KEY: "re_test" })("a@example.com")).rejects.toThrow(/RESEND_AUDIENCE_ID/);
  });
});

describe("resendSender", () => {
  it("posts the email to Resend with reply-to", async () => {
    const calls = stubFetch([{ status: 200, body: { id: "email_1" } }]);
    await resendSender("re_test", "FiixBE website <website@fiixbee.com>")(msg);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/emails$/);
    expect(calls[0].body).toMatchObject({
      from: "FiixBE website <website@fiixbee.com>",
      to: "hello@fiixbee.com",
      reply_to: "asha@example.com",
      subject: "New enquiry",
      text: "Hello",
    });
  });

  it("throws when Resend returns an error", async () => {
    stubFetch([{ status: 403, body: { name: "validation_error", message: "Domain not verified", statusCode: 403 } }]);
    await expect(resendSender("re_test", "a@fiixbee.com")(msg)).rejects.toThrow(/Domain not verified/);
  });
});

describe("resendSubscriber", () => {
  it("creates the contact in the segment", async () => {
    const calls = stubFetch([{ status: 201, body: { object: "contact", id: "c_1" } }]);
    await resendSubscriber("re_test", "seg_1")("reader@example.com");
    expect(calls[0].url).toMatch(/\/contacts$/);
    expect(calls[0].body).toMatchObject({ email: "reader@example.com", segments: [{ id: "seg_1" }] });
  });

  it("adds an existing contact to the segment instead of failing", async () => {
    const calls = stubFetch([
      { status: 409, body: { name: "validation_error", message: "Contact already exists", statusCode: 409 } },
      { status: 200, body: { id: "seg_1" } },
    ]);
    await resendSubscriber("re_test", "seg_1")("reader@example.com");
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toMatch(/\/contacts\/reader@example\.com\/segments\/seg_1$/);
  });

  it("throws on other errors", async () => {
    stubFetch([{ status: 401, body: { name: "invalid_api_key", message: "API key is invalid", statusCode: 401 } }]);
    await expect(resendSubscriber("re_bad", "seg_1")("reader@example.com")).rejects.toThrow(/API key is invalid/);
  });
});
