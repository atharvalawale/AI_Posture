import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Questions about FiixBE, trying it with your patients or bringing it to your clinic? Write to us and we reply within one working day.`,
  path: "/contact",
});

const details = [
  { label: "Email", value: <a href={`mailto:${site.email}`} className="underline decoration-line underline-offset-4 hover:decoration-text">{site.email}</a> },
  { label: "Based in", value: site.location },
  { label: "Replies", value: "Within one working day" },
];

const steps = [
  { title: "We read your message", body: "A person on the FiixBE team reads every message." },
  { title: "We reply within one working day", body: `The answer comes from ${site.email}, so you can reply straight back.` },
  {
    title: "Physios and clinics get a short call",
    body: "If you treat patients, we suggest a call to understand how you work and show you FiixBE with your own exercises.",
  },
];

export default function ContactPage() {
  return (
    <Container className="py-16 md:py-24">
      <div className="grid gap-x-20 gap-y-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-labelledby="contact-title" className="lg:col-start-1">
          <h1 id="contact-title" className="font-serif text-[44px] leading-[1.04] tracking-[-0.02em] md:text-[60px]">
            Let&rsquo;s talk.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            Whether you are a physiotherapist who wants to try FiixBE with your patients, a patient looking for guided rehab at
            home, or a clinic thinking about it for your team, we would like to hear from you.
          </p>
          <dl className="mt-10 max-w-md border-t border-line">
            {details.map((d) => (
              <div key={d.label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-4">
                <dt className="text-[15px] text-muted">{d.label}</dt>
                <dd className="text-[16px] text-text">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="form-title" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h2 id="form-title" className="font-serif text-[30px] leading-tight tracking-[-0.015em] md:text-[34px]">
            Send us a message
          </h2>
          <div className="mt-2">
            <ContactForm />
          </div>
        </section>

        <section aria-labelledby="next-title" className="lg:col-start-1">
          <h2 id="next-title" className="text-[17px] font-semibold">
            What happens next
          </h2>
          <ol className="mt-4 max-w-md">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 border-t border-line py-4 last:border-b">
                <span aria-hidden="true" className="w-4 shrink-0 text-[15px] text-muted tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[16px] font-semibold">{s.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted">
            Want to see it before you write?{" "}
            <Link href="/session" className="text-text underline decoration-line underline-offset-4 hover:decoration-text">
              Try it on the web
            </Link>{" "}
            with your laptop or phone camera.
          </p>
        </section>
      </div>
    </Container>
  );
}
