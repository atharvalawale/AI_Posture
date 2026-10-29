import { Resend, type ErrorResponse } from "resend";
import { site } from "@/lib/site";
import type { MailSender } from "./contact";
import type { Subscriber } from "./newsletter";

// Server only: this module reads secrets. The Resend SDK returns `{ data, error }` and does not throw
// on API errors, so every call checks `error` and turns it into an exception for the handlers.

const TIMEOUT_MS = 10_000;
const DEFAULT_FROM = `${site.name} website <website@${site.domain}>`;

type Env = Record<string, string | undefined>;

class ResendError extends Error {
  constructor(public readonly detail: ErrorResponse) {
    super(`Resend ${detail.name} (${detail.statusCode ?? "no status"}): ${detail.message}`);
    this.name = "ResendError";
  }
}

export function resendSender(apiKey: string, from: string): MailSender {
  const resend = new Resend(apiKey);
  return async ({ to, replyTo, subject, text }) => {
    const { error } = await resend.emails.send(
      { from, to, replyTo, subject, text },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (error) throw new ResendError(error);
  };
}

/**
 * Adds an address to a Resend segment (Resend renamed audiences to segments; old audience IDs work
 * as segment IDs). A contact that already exists is added to the segment instead.
 */
export function resendSubscriber(apiKey: string, segmentId: string): Subscriber {
  const resend = new Resend(apiKey);
  return async (email) => {
    const created = await resend.contacts.create(
      { email, segments: [{ id: segmentId }] },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!created.error) return;
    if (created.error.statusCode !== 409 && !/already exist/i.test(created.error.message)) {
      throw new ResendError(created.error);
    }
    const added = await resend.contacts.segments.add({ email, segmentId }, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (added.error) throw new ResendError(added.error);
  };
}

function missing(name: string): never {
  throw new Error(`${name} is not set`);
}

/** The contact sender from env. Without RESEND_API_KEY every send fails, so the route answers 502. */
export function mailSenderFromEnv(env: Env = process.env): MailSender {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return async () => missing("RESEND_API_KEY");
  return resendSender(key, env.RESEND_FROM?.trim() || DEFAULT_FROM);
}

export function subscriberFromEnv(env: Env = process.env): Subscriber {
  const key = env.RESEND_API_KEY?.trim();
  const segment = env.RESEND_AUDIENCE_ID?.trim();
  if (!key) return async () => missing("RESEND_API_KEY");
  if (!segment) return async () => missing("RESEND_AUDIENCE_ID");
  return resendSubscriber(key, segment);
}

export function contactRecipientFromEnv(env: Env = process.env): string {
  return env.CONTACT_TO?.trim() || site.email;
}
