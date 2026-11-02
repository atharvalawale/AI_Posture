import { z } from "zod";
import { site } from "@/lib/site";
import type { RateLimiter } from "./rate-limit";
import { badRequest, emailField, honeypotField, isHoneypotHit, OK, RATE_LIMITED, type ApiResult } from "./shared";

// Used by the contact route on the server and by ContactForm in the browser, so both check the same rules.

export const contactRoles = [
  { value: "patient", label: "A patient", name: "Patient" },
  { value: "physiotherapist", label: "A physiotherapist", name: "Physiotherapist" },
  { value: "clinic", label: "A clinic or hospital", name: "Clinic or hospital" },
  { value: "other", label: "Someone else", name: "Other" },
] as const;

export type ContactRole = (typeof contactRoles)[number]["value"];

const roleValues = contactRoles.map((r) => r.value) as [ContactRole, ...ContactRole[]];

export const contactSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(1, { error: "Enter your name." })
    .max(100, { error: "Keep your name under 100 characters." }),
  email: emailField,
  role: z.enum(roleValues, { error: "Choose the option that fits you best." }),
  message: z
    .string({ error: "Write at least 10 characters." })
    .trim()
    .min(10, { error: "Write at least 10 characters." })
    .max(4000, { error: "Keep your message under 4,000 characters." }),
  company: honeypotField,
});

export type ContactInput = z.infer<typeof contactSchema>;

export const CONTACT_SUCCESS = "Thanks, we will reply within one working day.";
export const CONTACT_FAILURE = `We could not send your message. Email us at ${site.email}.`;

export type MailSender = (msg: { to: string; replyTo: string; subject: string; text: string }) => Promise<void>;

export function contactEmail(input: ContactInput) {
  const name = input.name.replace(/\s+/g, " ");
  const role = contactRoles.find((r) => r.value === input.role)!;
  return {
    subject: `New enquiry from ${name} (${input.role})`,
    text: [
      `New enquiry from the ${site.name} website contact form.`,
      "",
      `Name: ${name}`,
      `Email: ${input.email}`,
      `Role: ${role.name}`,
      "",
      "Message:",
      input.message,
      "",
      `Reply to this email to answer ${name} directly.`,
    ].join("\n"),
  };
}

export async function handleContact(
  body: unknown,
  ip: string,
  send: MailSender,
  limiter: RateLimiter,
  to: string = site.email,
): Promise<ApiResult> {
  if (!limiter.hit(ip)) return { status: 429, body: { ok: false, error: RATE_LIMITED } };
  if (isHoneypotHit(body)) return OK;

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Check the form and try again.");

  const { subject, text } = contactEmail(parsed.data);
  try {
    await send({ to, replyTo: parsed.data.email, subject, text });
    return OK;
  } catch (err) {
    console.error("[contact] sending failed:", err instanceof Error ? err.message : err);
    return { status: 502, body: { ok: false, error: CONTACT_FAILURE } };
  }
}
