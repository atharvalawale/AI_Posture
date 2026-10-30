import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { weekDepths, type PoseClip } from "@/lib/pose";
import fixture from "../../../public/media/squat.pose.json";
import { RecoverySlider } from "./RecoverySlider";

const clip = fixture as PoseClip;

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => clip })),
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

/** The knee angle on display, once the clip has loaded. */
async function shownAngle(container: HTMLElement) {
  const el = container.querySelector("[data-recovery-angle]")!;
  await waitFor(() => expect(el.textContent).toMatch(/^\d+$/));
  return Number(el.textContent);
}

describe("RecoverySlider", () => {
  it("opens on week 1 with a shallow bend", async () => {
    const { container } = render(<RecoverySlider />);
    const angle = await shownAngle(container);
    expect(angle).toBeGreaterThanOrEqual(135);
    expect(angle).toBeLessThanOrEqual(145);
    expect(screen.getByText("Deepest knee bend, week 1")).toBeTruthy();
    expect(screen.getByRole("slider")).toHaveValue("1");
  });

  it("week 6 shows the full depth of the clip", async () => {
    const { container } = render(<RecoverySlider />);
    await shownAngle(container);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "6" } });
    const deepest = Math.round(weekDepths(clip)[5]);
    expect(deepest).toBe(95);
    expect(await shownAngle(container)).toBe(deepest);
    expect(slider.getAttribute("aria-valuetext")).toBe("Week 6, deepest knee bend 95°");
    expect(screen.getByText("Deepest knee bend, week 6")).toBeTruthy();
  });

  it("a week on the chart moves the slider", async () => {
    const { container } = render(<RecoverySlider />);
    await shownAngle(container);
    const depth3 = Math.round(weekDepths(clip)[2]);
    const point = screen.getByRole("button", { name: `Week 3, ${depth3}°` });
    fireEvent.click(point);
    expect(screen.getByRole("slider")).toHaveValue("3");
    expect(await shownAngle(container)).toBe(depth3);
    expect(point.getAttribute("aria-pressed")).toBe("true");
  });

  it("says the figure is an illustration", () => {
    render(<RecoverySlider />);
    expect(
      screen.getByText("An illustration built from real pose tracking of one squat. Your own numbers depend on your recovery."),
    ).toBeTruthy();
  });
});
