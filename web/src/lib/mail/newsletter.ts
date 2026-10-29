import { z } from "zod";
import { site } from "@/lib/site";
import type { RateLimiter } from "./rate-limit";
import { badRequest, emailField, honeypotField, isHoneypotHit, OK, RATE_LIMITED, type ApiResult } from "./shared";

/** Request body for POST /api/newsletter: `{ email: string, company?: string }`. */
export const newsletterSchema = z.object({ email: emailField, company: honeypotField });

export const NEWSLETTER_FAILURE = `We could not add you to the list. Email us at ${site.email}.`;

export type Subscriber = (email: string) => Promise<void>;

export async function handleNewsletter(
  body: unknown,
  ip: string,
  subscribe: Subscriber,
  limiter: RateLimiter,
): Promise<ApiResult> {
  if (!limiter.hit(ip)) return { status: 429, body: { ok: false, error: RATE_LIMITED } };
  if (isHoneypotHit(body)) return OK;

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Enter a valid email address.");

  try {
    await subscribe(parsed.data.email);
    return OK;
  } catch (err) {
    console.error("[newsletter] subscribing failed:", err instanceof Error ? err.message : err);
    return { status: 502, body: { ok: false, error: NEWSLETTER_FAILURE } };
  }
}
