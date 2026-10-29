import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveScreen } from "./screens/LiveScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { SummaryScreen } from "./screens/SummaryScreen";

const clip = JSON.parse(readFileSync(resolve(process.cwd(), "public/media/squat.pose.json"), "utf8"));

function fakeContext() {
  const names = ["clearRect", "setTransform", "beginPath", "moveTo", "lineTo", "stroke", "arc", "fill"] as const;
  return Object.fromEntries(names.map((n) => [n, vi.fn()])) as Record<(typeof names)[number], ReturnType<typeof vi.fn>>;
}

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

let ctx: ReturnType<typeof fakeContext>;

beforeEach(() => {
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx as never);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(clip))));
  // jsdom has no layout. Give elements the size of the phone screen.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(280);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(610);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LiveScreen", () => {
  it("shows the poster and no skeleton when autoplay is blocked", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    const { container } = render(<LiveScreen />);
    await wait(150);

    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("poster", "/media/squat-poster.jpg");
    expect(video.muted).toBe(true);
    expect(container.querySelector("[data-playing]")).toHaveAttribute("data-playing", "false");
    expect(ctx.clearRect).toHaveBeenCalled();
    for (const call of [ctx.stroke, ctx.fill, ctx.arc, ctx.lineTo]) expect(call).not.toHaveBeenCalled();
    expect(screen.getByText("Stand tall to begin")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("draws the skeleton once the video plays", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container } = render(<LiveScreen />);
    const video = container.querySelector("video")!;
    await act(async () => {
      video.dispatchEvent(new Event("playing"));
    });
    await wait(150);

    expect(container.querySelector("[data-playing]")).toHaveAttribute("data-playing", "true");
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    // Standing at t = 0: the knee is nearly straight.
    expect(screen.getByText(/^1[7-8]\d°$/)).toBeInTheDocument();
  });
});

describe("SummaryScreen", () => {
  it("shows the score and that it went to the physio", () => {
    render(<SummaryScreen />);
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("Sent to your physio")).toBeInTheDocument();
  });
});

describe("PlanScreen", () => {
  it("lists the exercises", () => {
    render(<PlanScreen />);
    for (const name of ["Squats", "Hamstring stretch", "Split squats"]) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText("Good morning, Riya")).toBeInTheDocument();
  });
});

describe("copy", () => {
  it("has no em dash or emoji on any screen", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("blocked"));
    const { container } = render(
      <>
        <LiveScreen />
        <SummaryScreen />
        <PlanScreen />
      </>,
    );
    await wait(50);
    const text = container.textContent ?? "";
    expect(text).not.toContain("—");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
