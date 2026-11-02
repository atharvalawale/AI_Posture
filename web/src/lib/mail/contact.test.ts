// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contactSchema, handleContact, type MailSender } from "./contact";
import { RateLimiter } from "./rate-limit";

type Sent = Parameters<MailSender>[0];

function fakeSender(fail = false) {
  const calls: Sent[] = [];
  const send: MailSender = async (msg) => {
    calls.push(msg);
    if (fail) throw new Error("provider down");
  };
  return { send, calls };
}

const valid = {
  name: "Asha Rao",
  email: "asha@example.com",
  role: "physiotherapist",
  message: "I run a small clinic and would like to try FiixBE with my patients.",
};

const limiter = () => new RateLimiter(5, 600_000);

describe("contactSchema", () => {
  it("accepts a valid enquiry and trims text", () => {
    const r = contactSchema.safeParse({ ...valid, name: "  Asha Rao  ", company: "" });
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe("Asha Rao");
  });

  it.each([
    ["empty name", { name: "   " }],
    ["name over 100 characters", { name: "a".repeat(101) }],
    ["invalid email", { email: "asha@" }],
    ["unknown role", { role: "investor" }],
    ["message under 10 characters", { message: "Hi there" }],
    ["message over 4000 characters", { message: "a".repeat(4001) }],
    ["filled honeypot", { company: "Spam Inc" }],
  ])("rejects %s", (_label, patch) => {
    expect(contactSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it.each(["patient", "physiotherapist", "clinic", "other"])("accepts role %s", (role) => {
    expect(contactSchema.safeParse({ ...valid, role }).success).toBe(true);
  });
});

describe("handleContact", () => {
  it("sends the enquiry to hello@fiixbee.com with the visitor as reply-to", async () => {
    const { send, calls } = fakeSender();
    const res = await handleContact(valid, "1.1.1.1", send, limiter());
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(calls).toHaveLength(1);
    expect(calls[0].to).toBe("hello@fiixbee.com");
    expect(calls[0].replyTo).toBe("asha@example.com");
    expect(calls[0].subject).toBe("New enquiry from Asha Rao (physiotherapist)");
    expect(calls[0].text).toContain(valid.message);
    expect(calls[0].text).toContain("asha@example.com");
  });

  it("sends to a configured recipient when given one", async () => {
    const { send, calls } = fakeSender();
    await handleContact(valid, "1.1.1.1", send, limiter(), "team@example.com");
    expect(calls[0].to).toBe("team@example.com");
  });

  it("keeps the subject on one line", async () => {
    const { send, calls } = fakeSender();
    await handleContact({ ...valid, name: "Asha\r\nBcc: x@y.z" }, "1.1.1.1", send, limiter());
    expect(calls[0].subject).toBe("New enquiry from Asha Bcc: x@y.z (physiotherapist)");
  });

  it("pretends success on a honeypot hit and sends nothing", async () => {
    const { send, calls } = fakeSender();
    const res = await handleContact({ ...valid, company: "Spam Inc" }, "1.1.1.1", send, limiter());
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["invalid fields", { ...valid, email: "nope" }],
    ["a null body", null],
    ["a string body", "hello"],
    ["an array body", [valid]],
  ])("returns 400 for %s and sends nothing", async (_label, body) => {
    const { send, calls } = fakeSender();
    const res = await handleContact(body, "1.1.1.1", send, limiter());
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("returns 502 naming hello@fiixbee.com when sending fails", async () => {
    const { send } = fakeSender(true);
    const res = await handleContact(valid, "1.1.1.1", send, limiter());
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ ok: false, error: "We could not send your message. Email us at hello@fiixbee.com." });
  });

  it("returns 429 after 5 messages from one address in the window", async () => {
    const { send, calls } = fakeSender();
    const l = limiter();
    for (let i = 0; i < 5; i++) expect((await handleContact(valid, "9.9.9.9", send, l)).status).toBe(200);
    const res = await handleContact(valid, "9.9.9.9", send, l);
    expect(res.status).toBe(429);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain("hello@fiixbee.com");
    expect(calls).toHaveLength(5);
    expect((await handleContact(valid, "8.8.8.8", send, l)).status).toBe(200);
  });
});
