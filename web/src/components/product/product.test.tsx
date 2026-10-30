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

  it("draws the target line in the bar track, not across the labels", () => {
    const { container } = render(<RepBars depths={[95, 102]} target={100} range={[70, 140]} />);
    const line = container.querySelector<HTMLElement>("[data-target-line]")!;
    const track = container.querySelector<HTMLElement>("[data-bar-track]")!;
    expect(line.parentElement).toBe(track);
    expect(track.querySelectorAll("[data-bar]")).toHaveLength(2);
    expect(track.textContent).not.toContain("95°");
    expect(line.textContent).toBe("100° target");
    expect(parseFloat(line.style.bottom)).toBeCloseTo((40 / 70) * 100, 5);
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
