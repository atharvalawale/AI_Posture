"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "field-error"; message: string }
  | { kind: "error"; message: string };

const RATE_LIMITED = "Too many attempts. Try again in a few minutes.";
const FAILED = `We could not add you right now. Email ${site.email}.`;

export function NewsletterForm() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const id = useId();
  const emailId = `${id}-email`;
  const messageId = `${id}-message`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const company = String(data.get("company") ?? "");
    setState({ kind: "sending" });

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok !== false) setState({ kind: "done" });
      else if (res.status === 400) setState({ kind: "field-error", message: body.error || "Enter a valid email address." });
      else if (res.status === 429) setState({ kind: "error", message: RATE_LIMITED });
      else setState({ kind: "error", message: FAILED });
    } catch {
      setState({ kind: "error", message: FAILED });
    }
  }

  if (state.kind === "done") {
    return (
      <p role="status" className="text-[17px] text-text">
        You are on the list.
      </p>
    );
  }

  const invalid = state.kind === "field-error";
  const message = state.kind === "field-error" || state.kind === "error" ? state.message : null;

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-[480px]">
      <label htmlFor={emailId} className="mb-2 block text-sm font-medium text-text">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={invalid}
          aria-describedby={message ? messageId : undefined}
          className={`h-12 w-full min-w-0 flex-1 rounded-[10px] border bg-bg px-4 text-[16px] text-text placeholder:text-muted ${invalid ? "border-text" : "border-line"}`}
        />
        <Button type="submit" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Subscribing" : "Subscribe"}
        </Button>
      </div>
      {/* Honeypot: people never see or reach it, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <p id={messageId} role={message ? "alert" : undefined} className="mt-2.5 flex min-h-[1.5em] items-start gap-2 text-sm text-text">
        {message && (
          <svg viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v4M8 11v.5" strokeLinecap="round" />
          </svg>
        )}
        <span>{message}</span>
      </p>
    </form>
  );
}
