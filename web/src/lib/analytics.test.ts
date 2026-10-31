import { afterEach, describe, expect, it, vi } from "vitest";
import { ctaParams, track } from "./analytics";

afterEach(() => {
  delete window.gtag;
});

describe("track", () => {
  it("sends a GA event through gtag", () => {
    window.gtag = vi.fn();
    track("generate_lead", { role: "clinic" });
    expect(window.gtag).toHaveBeenCalledWith("event", "generate_lead", { role: "clinic" });
  });

  it("does nothing without the tag, as on local runs and previews", () => {
    expect(() => track("sign_up")).not.toThrow();
  });
});

describe("ctaParams", () => {
  it("reads the link text, target and page", () => {
    const link = document.createElement("a");
    link.href = "/session";
    link.textContent = "  Start your\n   recovery ";
    expect(ctaParams(link, "/for-patients")).toEqual({ cta_text: "Start your recovery", link_url: "/session", page_path: "/for-patients" });
  });
});
