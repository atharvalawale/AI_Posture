import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RepBars } from "./RepBars";
import { TargetSlider } from "./TargetSlider";

afterEach(cleanup);

describe("RepBars", () => {
  it("marks reps that reached the target and reports clicks", () => {
    const onRep = vi.fn();
    render(<RepBars depths={[95.1, 101.9, 99.5]} target={100} onRep={onRep} />);
    const bars = screen.getAllByRole("button");
    expect(bars.map((b) => b.getAttribute("data-reached"))).toEqual(["true", "false", "true"]);
    expect(bars[0].getAttribute("aria-label")).toBe("Rep 1, 95°, reached your target");
    expect(bars[1].getAttribute("aria-label")).toBe("Rep 2, 102°, short of your target");
    fireEvent.click(bars[1]);
    expect(onRep).toHaveBeenCalledWith(1);
  });

  it("places the target line at the target height", () => {
    const { container } = render(<RepBars depths={[95]} target={120} />);
    const line = container.querySelector<HTMLElement>("[data-target-line]")!;
    expect(line.style.bottom).toBe("50%");
  });

  it("takes classes for the chart and its loading state", () => {
    const { container, rerender } = render(<RepBars depths={[95]} target={100} className="h-52" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("h-52");
    rerender(<RepBars depths={null} target={100} className="h-52" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("h-52");
  });

  it("draws the target line in the bar track, not across the labels, with its key below", () => {
    const { container } = render(<RepBars depths={[95, 102]} target={100} range={[70, 140]} />);
    const line = container.querySelector<HTMLElement>("[data-target-line]")!;
    const track = container.querySelector<HTMLElement>("[data-bar-track]")!;
    expect(line.parentElement).toBe(track);
    expect(track.querySelectorAll("[data-bar]")).toHaveLength(2);
    expect(track.textContent).not.toContain("95°");
    // The line carries no label, so the bars stay centred. The key under the chart names the target.
    expect(line.textContent).toBe("");
    expect(container.querySelector("[data-target-key]")!.textContent).toBe("100° target");
    expect(parseFloat(line.style.bottom)).toBeCloseTo((40 / 70) * 100, 5);
  });

  it("grows the bars upward and counts a rep as reached at or above the target when higher is better", () => {
    const { container } = render(<RepBars depths={[91, 78, 93]} target={90} direction="higher" range={[30, 120]} onRep={() => {}} />);
    const bars = screen.getAllByRole("button");
    expect(bars.map((b) => b.getAttribute("data-reached"))).toEqual(["true", "false", "true"]);
    expect(bars[0].getAttribute("aria-label")).toBe("Rep 1, 91°, reached your target");
    expect(bars[1].getAttribute("aria-label")).toBe("Rep 2, 78°, short of your target");
    const heights = [...container.querySelectorAll<HTMLElement>("[data-bar]")].map((b) => parseFloat(b.style.height));
    expect(heights[0]).toBeCloseTo((61 / 90) * 100, 5);
    expect(heights[1]).toBeLessThan(heights[0]);
    const line = container.querySelector<HTMLElement>("[data-target-line]")!;
    expect(parseFloat(line.style.bottom)).toBeCloseTo((60 / 90) * 100, 5);
  });

  it("shows bars that are not buttons when nothing listens for a rep", () => {
    render(<RepBars depths={[91, 78]} target={90} direction="higher" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("img").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Rep 1, 91°, reached your target",
      "Rep 2, 78°, short of your target",
    ]);
  });

  it("shows a loading line when depths are null", () => {
    render(<RepBars depths={null} target={100} />);
    expect(screen.getByText("Loading the session")).toBeTruthy();
  });
});

describe("TargetSlider", () => {
  it("calls onChange with the number", () => {
    const onChange = vi.fn();
    render(<TargetSlider value={100} onChange={onChange} label="Target depth" />);
    const input = screen.getByRole("slider");
    expect(input.getAttribute("aria-valuetext")).toBe("100°");
    fireEvent.change(input, { target: { value: "102" } });
    expect(onChange).toHaveBeenCalledWith(102);
  });
});
