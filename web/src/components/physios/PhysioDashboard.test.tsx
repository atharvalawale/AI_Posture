import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveSession, findReps, type PoseClip } from "@/lib/pose";
import { PhysioDashboard } from "./PhysioDashboard";

const clip = JSON.parse(readFileSync(resolve(process.cwd(), "public/media/squat.pose.json"), "utf8")) as PoseClip;
const reps = findReps(clip);

/** The value shown under "Form score". */
const formScore = () => screen.getByText("Form score").nextElementSibling?.textContent;

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

beforeEach(() => {
  const ctx = new Proxy({}, { get: () => vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx as never);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// The pose clip loader caches per URL and drops a failed load, so the failing case runs first.
describe("PhysioDashboard without the clip", () => {
  it("renders the patients and a loading line when the clip cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    render(<PhysioDashboard />);
    await wait(50);
    for (const name of ["Maya Thomas", "Arjun Mehta", "Rohan Kulkarni"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByText("Loading the session")).toBeInTheDocument();
  });
});

describe("PhysioDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(clip))));
  });

  it("counts the reps that reached the target and flags the short one", async () => {
    render(<PhysioDashboard />);
    expect(await screen.findByText("2 of 3 reached your target")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rep 2 stopped short of your target/ })).toBeInTheDocument();
  });

  it("recounts, rescores and reflags as the target slider moves", async () => {
    render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");
    const formAt100 = formScore();

    fireEvent.change(screen.getByRole("slider"), { target: { value: "102" } });
    expect(screen.getByText("3 of 3 reached your target")).toBeInTheDocument();
    expect(screen.getByText("Every rep reached your target")).toBeInTheDocument();
    expect(screen.queryByText(/stopped short/)).toBeNull();
    expect(formScore()).toBe("100");

    fireEvent.change(screen.getByRole("slider"), { target: { value: "85" } });
    expect(screen.getByText("0 of 3 reached your target")).toBeInTheDocument();
    expect(Number(formScore())).toBeLessThan(Number(formAt100));
  });

  it("loops a rep from its bar or its flag, and plays all again", async () => {
    const loop = vi.spyOn(LiveSession.prototype, "loop");
    render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");

    fireEvent.click(screen.getByRole("button", { name: /^Rep 1, / }));
    expect(loop).toHaveBeenLastCalledWith([reps[0].start, reps[0].end]);
    expect(screen.getByRole("button", { name: /^Rep 1, / })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Rep 2 stopped short of your target/ }));
    expect(loop).toHaveBeenLastCalledWith([reps[1].start, reps[1].end]);

    fireEvent.click(screen.getByRole("button", { name: "Play all" }));
    expect(loop).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Play all" })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks each rep's bottom on the replay timeline", async () => {
    const { container } = render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");
    expect(container.querySelectorAll("[data-rep-mark]")).toHaveLength(reps.length);
  });

  it("switches to another patient, with their photo and their flags", async () => {
    const { container } = render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");

    fireEvent.click(screen.getByRole("button", { name: /Arjun Mehta/ }));
    expect(screen.getByRole("button", { name: /Arjun Mehta/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Rotator cuff repair, week 6")).toBeInTheDocument();
    expect(screen.getByText("Missed 4 sessions this week")).toBeInTheDocument();
    expect(screen.getByText("Raise stopped at 78° on the left")).toBeInTheDocument();
    expect(formScore()).toBe("74");
    expect(container.querySelector('img[src*="shoulder_raises"]')).not.toBeNull();
    // The squat rep bars and slider only describe Maya's clip, so they rest, dimmed and inert.
    expect(screen.getByRole("slider", { hidden: true }).closest("[inert]")).not.toBeNull();
  });
});
