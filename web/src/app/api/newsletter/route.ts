import { handleNewsletter } from "@/lib/mail/newsletter";
import { clientIp, RateLimiter } from "@/lib/mail/rate-limit";
import { subscriberFromEnv } from "@/lib/mail/resend";
import { readJson } from "@/lib/mail/shared";

// Contract: body `{ email: string, company?: string }`, response `{ ok: boolean, error?: string }`
// with status 200, 400, 429 or 502.
const limiter = new RateLimiter(5, 10 * 60_000);

export async function POST(request: Request) {
  const body = await readJson(request, 4_096);
  const result = await handleNewsletter(body, clientIp(request.headers), subscriberFromEnv(), limiter);
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
