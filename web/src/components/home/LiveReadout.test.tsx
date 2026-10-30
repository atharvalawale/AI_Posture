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
};

afterEach(cleanup);

describe("LiveReadout", () => {
  it("renders the value with a separate degree sign", () => {
    const { container } = render(<LiveReadout state={base} onJoint={() => {}} variant="full" />);
    const num = container.querySelector("[data-readout-value]")!;
    expect(num.textContent).toContain("95");
    expect(screen.getByText("°", { selector: "span.font-sans" })).toBeTruthy();
    expect(container.querySelector("[data-readout-joint]")!.textContent).toBe("Knee");
  });

  it("shows the physio target in the full variant", () => {
    render(<LiveReadout state={base} onJoint={() => {}} variant="full" />);
    expect(screen.getByText("Your physio's target: 100°")).toBeTruthy();
  });

  it("exposes the goal to assistive tech, not only inside the drawn track", () => {
    const { rerender } = render(<LiveReadout state={base} onJoint={() => {}} variant="full" />);
    expect(screen.getByRole("img", { name: "Your physio's target: 100°" })).toBeTruthy();
    rerender(<LiveReadout state={{ ...base, joint: "back", value: 20 }} onJoint={() => {}} variant="compact" />);
    expect(screen.getByRole("img", { name: "Keep it under 45°" })).toBeTruthy();
  });

  it("picks a joint and marks the selected one", () => {
    const onJoint = vi.fn();
    render(<LiveReadout state={base} onJoint={onJoint} variant="full" />);
    fireEvent.click(screen.getByRole("button", { name: "Hip" }));
    expect(onJoint).toHaveBeenCalledWith("hip");
    expect(screen.getByRole("button", { name: "Knee" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Hip" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("shows placeholders for empty values", () => {
    const { container } = render(<LiveReadout state={{ ...base, value: null, form: null, extreme: null }} onJoint={() => {}} variant="full" />);
    expect(container.querySelector("[data-readout-value]")!.textContent).toContain("--");
    expect(screen.getAllByText("-").length).toBe(2);
  });

  it("has no buttons in the compact variant", () => {
    render(<LiveReadout state={base} onJoint={() => {}} variant="compact" />);
    expect(screen.queryAllByRole("button").length).toBe(0);
    expect(screen.getByText("Reps")).toBeTruthy();
  });

  it("uses back wording", () => {
    render(<LiveReadout state={{ ...base, joint: "back", value: 20 }} onJoint={() => {}} variant="full" />);
    expect(screen.getByText("Most lean")).toBeTruthy();
    expect(screen.getByText("Keep it under 45°")).toBeTruthy();
  });

  it("announces the cue politely", () => {
    render(<LiveReadout state={base} onJoint={() => {}} variant="full" />);
    expect(screen.getByText("Stand tall to begin").closest("[aria-live]")!.getAttribute("aria-live")).toBe("polite");
  });
});
