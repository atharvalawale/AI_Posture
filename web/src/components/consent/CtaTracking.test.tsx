import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CtaTracking } from "./CtaTracking";

afterEach(() => {
  delete window.gtag;
});

describe("CtaTracking", () => {
  it("reports clicks on button-styled links, and only those", () => {
    window.gtag = vi.fn();
    const { container } = render(
      <>
        <CtaTracking />
        <a href="/session" data-cta="">
          <span>Try it on the web</span>
        </a>
        <a href="/blog">Blog</a>
      </>,
    );
    fireEvent.click(container.querySelector("span")!);
    fireEvent.click(container.querySelector('a[href="/blog"]')!);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith("event", "cta_click", { cta_text: "Try it on the web", link_url: "/session", page_path: "/" });
  });
});
