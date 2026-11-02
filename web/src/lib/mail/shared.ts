import { z } from "zod";
import { site } from "@/lib/site";

// Shared by the server handlers and the browser forms. Keep this file free of server-only imports.

export type ApiBody = { ok: boolean; error?: string };
export type ApiResult = { status: 200 | 400 | 429 | 502; body: ApiBody };

export const OK: ApiResult = { status: 200, body: { ok: true } };

export const RATE_LIMITED = `You have sent several requests in a short time. Please wait a few minutes, or email us at ${site.email}.`;

export const emailField = z
  .string({ error: "Enter a valid email address." })
  .trim()
  .max(254, { error: "Enter a valid email address." })
  .pipe(z.email({ error: "Enter a valid email address." }));

/** Hidden field that people never see. Anything typed into it came from a bot. */
export const honeypotField = z.string().max(0).optional();

/** True when the body carries a filled-in honeypot. The caller then pretends success and does nothing. */
export function isHoneypotHit(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const value = (body as Record<string, unknown>).company;
  return value !== undefined && value !== null && value !== "";
}

export function badRequest(error: string): ApiResult {
  return { status: 400, body: { ok: false, error } };
}

/** Reads a JSON body. Returns null when it is missing, malformed or larger than `maxBytes`. */
export async function readJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
