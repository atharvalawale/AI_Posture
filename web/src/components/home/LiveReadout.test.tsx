import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LiveState } from "@/lib/pose";
import { LiveReadout } from "./LiveReadout";

const base: LiveState = {
  t: 1,
  joint: "knee",
  value: 95,
  knee: 95,
  reps: 2,
  cue: "Stand tall to begin",
  extreme: 92,
  depths: [],
  form: 88,
  scrubbing: false,
  driven: false,
};

const announced = (container: HTMLElement) => container.querySelector("[aria-live]")!;

afterEach(cleanup);

describe("LiveReadout", () => {
  it("renders the value with a separate degree sign", () => {
    const { container } = render(<LiveReadout state={base} onJoint={() => {}} />);
    const num = container.querySelector("[data-readout-value]")!;
    expect(num.textContent).toContain("95");
    expect(screen.getByText("°", { selector: "span.font-sans" })).toBeTruthy();
    expect(container.querySelector("[data-readout-joint]")!.textContent).toBe("Knee");
  });

  it("shows the physio target", () => {
    render(<LiveReadout state={base} onJoint={() => {}} />);
    expect(screen.getByText("Your physio's target: 100°")).toBeTruthy();
  });

  it("exposes the goal to assistive tech, not only inside the drawn track", () => {
    const { rerender } = render(<LiveReadout state={base} onJoint={() => {}} />);
    expect(screen.getByRole("img", { name: "Your physio's target: 100°" })).toBeTruthy();
    rerender(<LiveReadout state={{ ...base, joint: "back", value: 20 }} onJoint={() => {}} />);
    expect(screen.getByRole("img", { name: "Keep it under 45°" })).toBeTruthy();
  });

  it("picks a joint and marks the selected one", () => {
    const onJoint = vi.fn();
    render(<LiveReadout state={base} onJoint={onJoint} />);
    fireEvent.click(screen.getByRole("button", { name: "Hip" }));
    expect(onJoint).toHaveBeenCalledWith("hip");
    expect(screen.getByRole("button", { name: "Knee" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Hip" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the same placeholder as every other view for empty values", () => {
    const { container } = render(<LiveReadout state={{ ...base, value: null, form: null, extreme: null }} onJoint={() => {}} />);
    expect(container.querySelector("[data-readout-value]")!.textContent).toBe("--");
    expect(screen.getAllByText("--", { selector: "dd" })).toHaveLength(2);
  });

  // Phones get the compact readout from CSS: no joint buttons, no cue line, and the joint's name beside the number.
  it("keeps the joint buttons and the cue line for 640 px and up", () => {
    const { container } = render(<LiveReadout state={base} onJoint={() => {}} />);
    expect(container.querySelector("[data-readout-joints]")!.className).toMatch(/(^| )hidden( |$).*sm:flex/);
    expect(screen.getByText("Stand tall to begin", { selector: "p:not([aria-live])" }).className).toMatch(/(^| )hidden( |$).*sm:block/);
  });

  it("names the joint beside the number below 640 px", () => {
    render(<LiveReadout state={{ ...base, joint: "hip", value: 80 }} onJoint={() => {}} />);
    const beside = screen.getByText("Hip", { selector: "span[aria-hidden]" });
    expect(beside.className).toContain("sm:hidden");
    expect(beside.className).toContain("text-[13px]");
  });

  it("uses back wording", () => {
    render(<LiveReadout state={{ ...base, joint: "back", value: 20 }} onJoint={() => {}} />);
    expect(screen.getByText("Most lean")).toBeTruthy();
    expect(screen.getByText("Keep it under 45°")).toBeTruthy();
  });

  it("stays quiet while the clip plays on its own", () => {
    const { container, rerender } = render(<LiveReadout state={base} onJoint={() => {}} />);
    expect(announced(container).getAttribute("aria-live")).toBe("polite");
    expect(announced(container).textContent).toBe("");
    rerender(<LiveReadout state={{ ...base, cue: "Lower slowly", value: 120 }} onJoint={() => {}} />);
    expect(announced(container).textContent).toBe("");
  });

  it("announces the joint, its angle and the cue while the visitor drives the clip", () => {
    const { container, rerender } = render(<LiveReadout state={{ ...base, driven: true, cue: "Good depth, hold" }} onJoint={() => {}} />);
    expect(announced(container).textContent).toBe("Knee 95°. Good depth, hold");
    rerender(<LiveReadout state={{ ...base, driven: true, joint: "hip", value: 80 }} onJoint={() => {}} />);
    expect(announced(container).textContent).toBe("Hip 80°. Stand tall to begin");
  });
});
