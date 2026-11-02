import { handleContact } from "@/lib/mail/contact";
import { clientIp, RateLimiter } from "@/lib/mail/rate-limit";
import { contactRecipientFromEnv, mailSenderFromEnv } from "@/lib/mail/resend";
import { readJson } from "@/lib/mail/shared";

// POST handlers always run at request time, so env vars are read per request.
const limiter = new RateLimiter(5, 10 * 60_000);

export async function POST(request: Request) {
  const body = await readJson(request);
  const result = await handleContact(
    body,
    clientIp(request.headers),
    mailSenderFromEnv(),
    limiter,
    contactRecipientFromEnv(),
  );
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
