import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveSession, findReps, weekDepths, type PoseClip } from "@/lib/pose";
import { clearPoseClipCache } from "@/lib/pose/clip";
import { AlertsPanel, BOOKED, CALENDAR_START, FEATURE_PANELS, FormPanel } from "./featurePanels";
import { PhysioDashboard } from "./PhysioDashboard";

const clip = JSON.parse(readFileSync(resolve(process.cwd(), "public/media/squat.pose.json"), "utf8")) as PoseClip;
const reps = findReps(clip);

/** The value shown under "Form score". */
const formScore = () => screen.getByText("Form score").nextElementSibling?.textContent;

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

const serveClip = () => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(clip))));

beforeEach(() => {
  // Each test loads the clip itself, so the tests pass in any order.
  clearPoseClipCache();
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

describe("PhysioDashboard", () => {
  it("renders the patients, and says the session could not load when the clip cannot", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    render(<PhysioDashboard />);
    await wait(50);
    for (const name of ["Maya Thomas", "Arjun Mehta", "Rohan Kulkarni"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByText("Session data could not load")).toBeInTheDocument();
    expect(screen.queryByText("Loading the session")).toBeNull();
  });

  it("counts the reps that reached the target and flags the short one", async () => {
    serveClip();
    render(<PhysioDashboard />);
    expect(await screen.findByText("2 of 3 reached your target")).toBeInTheDocument();
    expect(screen.getByText("Set 1, first 3 reps, deepest knee bend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rep 2 stopped short of your target/ })).toBeInTheDocument();
  });

  it("recounts, rescores and reflags as the target slider moves", async () => {
    serveClip();
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

  it("loops and plays a rep from its bar or its flag, toggles it off, and plays all again", async () => {
    serveClip();
    const loop = vi.spyOn(LiveSession.prototype, "loop");
    const play = HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>;
    render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");

    play.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^Rep 1, / }));
    expect(loop).toHaveBeenLastCalledWith([reps[0].start, reps[0].end]);
    expect(play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Rep 1, / })).toHaveAttribute("aria-pressed", "true");

    const flag = screen.getByRole("button", { name: /Rep 2 stopped short of your target/ });
    fireEvent.click(flag);
    expect(loop).toHaveBeenLastCalledWith([reps[1].start, reps[1].end]);
    expect(flag).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(flag);
    expect(loop).toHaveBeenLastCalledWith(null);
    expect(flag).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: /^Rep 3, / }));
    const playAll = screen.getByRole("button", { name: "Play all" });
    expect(playAll).not.toHaveAttribute("aria-pressed");
    fireEvent.click(playAll);
    expect(loop).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("Pick a rep to replay it.")).toBeInTheDocument();
  });

  it("marks each rep's bottom on the replay timeline", async () => {
    serveClip();
    const { container } = render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");
    expect(container.querySelectorAll("[data-rep-mark]")).toHaveLength(reps.length);
  });

  it("shows Arjun his own arm raises against his 90° target, with his photo and his week", async () => {
    serveClip();
    const { container } = render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");

    fireEvent.click(screen.getByRole("button", { name: /Arjun Mehta/ }));
    expect(screen.getByRole("button", { name: /Arjun Mehta/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Rotator cuff repair, week 6")).toBeInTheDocument();
    expect(screen.queryByText("Set 1, first 3 reps, deepest knee bend")).toBeNull();
    expect(screen.getByText("Highest left arm raise per rep")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 reached your target")).toBeInTheDocument();
    expect(formScore()).toBe("91");

    // His bars show his angles but replay nothing: there is no footage.
    expect(screen.queryByRole("button", { name: /^Rep \d, / })).toBeNull();
    expect(screen.getAllByRole("img", { name: /^Rep \d, / }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Rep 1, 91°, reached your target",
      "Rep 2, 78°, short of your target",
      "Rep 3, 93°, reached your target",
    ]);
    expect(screen.queryByRole("button", { name: "Play all" })).toBeNull();

    const short = screen.getByText("Rep 2 stopped short of your target").parentElement!;
    expect(short.tagName).not.toBe("BUTTON");
    expect(within(short).getByText("78°")).toBeInTheDocument();
    expect(within(container.querySelector<HTMLElement>("[data-patient-detail]")!).getByText("Missed 4 sessions this week")).toBeInTheDocument();

    const slider = screen.getByRole("slider", { name: "Your target for Arjun" });
    expect(slider).toHaveValue("90");
    expect(slider).toHaveAttribute("min", "70");
    expect(slider).toHaveAttribute("max", "120");
    fireEvent.change(slider, { target: { value: "78" } });
    expect(screen.getByText("3 of 3 reached your target")).toBeInTheDocument();
    expect(screen.getByText("Every rep reached your target")).toBeInTheDocument();
    expect(formScore()).toBe("100");

    expect(container.querySelector('img[src*="shoulder_raises"]')).not.toBeNull();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getAllByText("Missed")).toHaveLength(4);
    // Today is Sunday, and his session this morning is the photo above his week.
    expect(screen.getByText("Shoulder raises, this morning")).toBeInTheDocument();
    expect(screen.getByText("Sunday").nextSibling?.textContent).toBe("Done this morning");
    expect(screen.getByText("3 of 7")).toBeInTheDocument();
  });

  it("keeps each patient's target when switching between them", async () => {
    serveClip();
    render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "110" } });

    fireEvent.click(screen.getByRole("button", { name: /Rohan Kulkarni/ }));
    expect(screen.getByText("Highest leg lift per rep")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Your target for Rohan" })).toHaveValue("40");

    fireEvent.click(screen.getByRole("button", { name: /Maya Thomas/ }));
    expect(screen.getByRole("slider", { name: "Your target for Maya" })).toHaveValue("110");
  });
});

describe("morning queue", () => {
  it("counts this morning's sessions and puts first what needs the physio, at the targets set on the dashboard", async () => {
    serveClip();
    render(<PhysioDashboard />);
    await screen.findByText("2 of 3 reached your target");
    expect(screen.getByText("3 of 3 sessions in")).toBeInTheDocument();
    const queue = () => screen.getByText("Worth a look first").nextElementSibling as HTMLElement;
    expect(within(queue()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      `MayaRep 2 stopped at ${Math.round(reps[1].depth)}°`,
      "ArjunMissed 4 sessions this week",
      "RohanRep 2 stopped at 37°",
    ]);

    // Every one of Maya's reps reaches a 105° target, so she leaves the queue.
    fireEvent.change(screen.getByRole("slider", { name: "Your target for Maya" }), { target: { value: "105" } });
    expect(within(queue()).queryByText("Maya")).toBeNull();

    fireEvent.click(within(queue()).getByRole("button", { name: /Arjun/ }));
    expect(screen.getByText("Rotator cuff repair, week 6")).toBeInTheDocument();
  });
});

describe("feature panels", () => {
  it("computes Maya's knee bend and its change from the clip", async () => {
    serveClip();
    render(<FormPanel />);
    const deepest = Math.round(Math.min(...reps.map((r) => r.depth)));
    const deeper = Math.round(weekDepths(clip)[0]) - deepest;
    await waitFor(() => expect(document.querySelector("[data-form-deepest]")?.textContent).toBe(`${deepest}°`));
    expect(deepest).toBe(95);
    expect(screen.getByText(`${deeper}° deeper`)).toBeInTheDocument();
    expect(deeper).toBe(46);
  });

  it("alerts on the rep the dashboard flags, with its angle from the clip", async () => {
    serveClip();
    render(<AlertsPanel />);
    expect(await screen.findByText(`Maya's rep 2 stopped at ${Math.round(reps[1].depth)}°`)).toBeInTheDocument();
    expect(Math.round(reps[1].depth)).toBe(102);
    expect(screen.getByText("Arjun missed 4 sessions")).toBeInTheDocument();
    // His last session is the one the dashboard replays: this morning's.
    expect(screen.getByText("Last session this morning")).toBeInTheDocument();
    expect(screen.getByText("All 7 sessions done")).toBeInTheDocument();
  });

  it("books Maya on a real Thursday in a calendar that starts on a real Monday", () => {
    expect(CALENDAR_START.getDay()).toBe(1);
    expect(new Date(2026, 10, BOOKED).getDay()).toBe(4);
    const Booking = FEATURE_PANELS.book;
    render(<Booking />);
    expect(screen.getByText("Thu 5, 10:30")).toBeInTheDocument();
  });
});
