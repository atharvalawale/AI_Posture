"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CONTACT_SUCCESS, contactRoles, contactSchema } from "@/lib/mail/contact";
import { site } from "@/lib/site";

type Field = "name" | "email" | "role" | "message";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "failed" } | { kind: "rejected"; message: string };

const FIELDS: Field[] = ["name", "email", "role", "message"];
const EMPTY: Values = { name: "", email: "", role: "", message: "" };

// Error red lives here, not in the global tokens: only forms use it. Both shades pass 4.5:1 on --bg and --surface.
const theme = "[--danger:#a8382b] dark:[--danger:#ef9a8e]";

const control =
  "block w-full rounded-[10px] border bg-surface px-4 text-[16px] transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:outline-offset-0!";

function validate(values: Values): Errors {
  const result = contactSchema.safeParse({ ...values, company: "" });
  const errors: Errors = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0] as Field;
    errors[field] ??= issue.message;
  }
  return errors;
}

export function ContactForm() {
  const id = useId();
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (status.kind === "sent") sentHeadingRef.current?.focus();
  }, [status.kind]);

  const fieldId = (field: Field) => `${id}-${field}`;
  const errorId = (field: Field) => `${id}-${field}-error`;

  function update(field: Field, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Once a field shows an error, re-check it as the visitor types so the error clears when fixed.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validate(next)[field] }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;

    const found = validate(values);
    const invalid = FIELDS.filter((f) => found[f]);
    setErrors(found);
    if (invalid.length > 0) {
      setSummary(invalid.length === 1 ? "1 field needs attention." : `${invalid.length} fields need attention.`);
      document.getElementById(fieldId(invalid[0]))?.focus();
      return;
    }
    setSummary("");

    const honeypot = new FormData(event.currentTarget).get("hp_extra");
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, company: typeof honeypot === "string" ? honeypot : "" }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) setStatus({ kind: "sent" });
      else if ((res.status === 400 || res.status === 429) && data?.error) setStatus({ kind: "rejected", message: data.error });
      else setStatus({ kind: "failed" });
    } catch {
      setStatus({ kind: "failed" });
    }
  }

  function startOver() {
    setValues(EMPTY);
    setErrors({});
    setStatus({ kind: "idle" });
    requestAnimationFrame(() => document.getElementById(fieldId("name"))?.focus());
  }

  if (status.kind === "sent") {
    return (
      <div className={`${theme} mt-6 rounded-[16px] border border-line bg-surface p-8 md:p-10`}>
        <h2 ref={sentHeadingRef} tabIndex={-1} className="font-serif text-[30px] leading-tight tracking-[-0.015em] focus:outline-none">
          Message sent
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">{CONTACT_SUCCESS}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">
          The reply comes from {site.email}, so check your spam folder if it does not show up.
        </p>
        <Button variant="line" className="mt-8" onClick={startOver}>
          Send another message
        </Button>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={sending} className={`${theme} relative grid gap-6`}>
      <p className="-mb-2 text-[15px] text-muted">All fields are required.</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Your name" htmlFor={fieldId("name")} errorId={errorId("name")} error={errors.name}>
          <input
            id={fieldId("name")}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? errorId("name") : undefined}
            className={`${control} h-12 text-text ${errors.name ? "border-(--danger)" : "border-line"}`}
          />
        </FormField>
        <FormField label="Email" htmlFor={fieldId("email")} errorId={errorId("email")} error={errors.email}>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? errorId("email") : undefined}
            className={`${control} h-12 text-text ${errors.email ? "border-(--danger)" : "border-line"}`}
          />
        </FormField>
      </div>

      <FormField label="I am" htmlFor={fieldId("role")} errorId={errorId("role")} error={errors.role}>
        <div className="relative">
          <select
            id={fieldId("role")}
            name="role"
            value={values.role}
            onChange={(e) => update("role", e.target.value)}
            aria-invalid={errors.role ? true : undefined}
            aria-describedby={errors.role ? errorId("role") : undefined}
            className={`${control} h-12 cursor-pointer appearance-none pr-11 ${values.role ? "text-text" : "text-muted"} ${errors.role ? "border-(--danger)" : "border-line"}`}
          >
            <option value="" disabled>
              Choose one
            </option>
            {contactRoles.map((r) => (
              <option key={r.value} value={r.value} className="text-text">
                {r.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </div>
      </FormField>

      <FormField
        label="Message"
        htmlFor={fieldId("message")}
        errorId={errorId("message")}
        error={errors.message}
        hint="Tell us a little about your recovery, your practice or your question."
        hintId={`${id}-message-hint`}
      >
        <textarea
          id={fieldId("message")}
          name="message"
          rows={6}
          maxLength={4000}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={[`${id}-message-hint`, errors.message ? errorId("message") : ""].filter(Boolean).join(" ")}
          className={`${control} min-h-40 text-text resize-y py-3 leading-relaxed ${errors.message ? "border-(--danger)" : "border-line"}`}
        />
      </FormField>

      {/* Honeypot: hidden from people and screen readers. Bots fill it; the server then drops the message. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-hp`}>Leave this field empty</label>
        <input id={`${id}-hp`} name="hp_extra" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <p role="status" className="sr-only">
        {summary}
      </p>

      {status.kind === "failed" && (
        <Notice>
          We could not send your message. Email us at{" "}
          <a href={`mailto:${site.email}`} className="font-medium underline underline-offset-4">
            {site.email}
          </a>
          .
        </Notice>
      )}
      {status.kind === "rejected" && <Notice>{status.message}</Notice>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={sending} className="w-full sm:w-auto">
          {sending ? "Sending..." : "Send message"}
        </Button>
        <p className="text-sm text-muted">We only use your details to reply to you.</p>
      </div>
    </form>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  errorId,
  hint,
  hintId,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  errorId: string;
  hint?: string;
  hintId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-text">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-(--danger)">
          {error}
        </p>
      )}
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[10px] border border-(--danger) bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-[15px] leading-relaxed text-text"
    >
      {children}
    </p>
  );
}
