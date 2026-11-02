import { act, cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveSession, POSTER_KNEE, type PoseClip } from "@/lib/pose";
import { MAYA_SESSION } from "@/lib/sample";
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
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LiveScreen", () => {
  it("shows the poster and no skeleton when autoplay is blocked", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    const { container } = render(<LiveScreen />);
    await wait(150);

    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("poster", "/media/squat-poster.webp");
    expect(video.muted).toBe(true);
    expect(container.querySelector("[data-playing]")).toHaveAttribute("data-playing", "false");
    expect(ctx.clearRect).toHaveBeenCalled();
    for (const call of [ctx.stroke, ctx.fill, ctx.arc, ctx.lineTo]) expect(call).not.toHaveBeenCalled();
    expect(screen.getByText("Stand tall to begin")).toBeInTheDocument();
    // The poster is the clip's first frame, so the knee reads its angle there.
    expect(screen.getByText(`Knee ${POSTER_KNEE}°`)).toBeInTheDocument();
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
    expect(screen.getByText(/^Knee 1[7-8]\d°$/)).toBeInTheDocument();
  });
});

describe("LiveScreen session", () => {
  it("shows the selected joint", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const session = new LiveSession(clip as PoseClip);
    const { container } = render(<LiveScreen session={session} />);
    await act(async () => {
      container.querySelector("video")!.dispatchEvent(new Event("playing"));
    });
    await wait(150);
    act(() => session.setJoint("hip"));
    expect(screen.getByText(/^Hip /)).toBeInTheDocument();
  });

  it("draws and feeds the session on seeked while paused", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    const session = new LiveSession(clip as PoseClip);
    const { container } = render(<LiveScreen session={session} />);
    await wait(150);
    expect(ctx.arc).not.toHaveBeenCalled();

    const video = container.querySelector("video")!;
    video.currentTime = 3;
    await act(async () => {
      video.dispatchEvent(new Event("seeked"));
    });
    expect(ctx.arc).toHaveBeenCalled();
    expect(session.getSnapshot().knee).not.toBeNull();
  });
});

describe("SummaryScreen", () => {
  it("shows the score and that it went to the physio", () => {
    render(<SummaryScreen />);
    expect(screen.getByText(String(MAYA_SESSION.formScore))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Up ${MAYA_SESSION.change} from yesterday`))).toBeInTheDocument();
    // Set 1's reps from the clip, one bar each.
    expect(document.querySelectorAll("i")).toHaveLength(MAYA_SESSION.depths.length);
    for (const d of MAYA_SESSION.depths) expect(screen.getByText(`${d}°`, { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Set 1, first 3 reps")).toBeInTheDocument();
    expect(screen.getByText("Sent to your physio")).toBeInTheDocument();
  });
});

describe("SummaryScreen scroll fill", () => {
  it("counts the score and fills the bars as the story scrolls", () => {
    const progress = { current: 0.34 };
    const listeners = new Set<() => void>();
    const story = {
      progress,
      onProgress: (fn: () => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
    const { container } = render(<SummaryScreen story={story} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    const bars = [...container.querySelectorAll<HTMLElement>("i")];
    expect(bars.every((b) => b.style.transform === "scaleY(0)")).toBe(true);

    progress.current = 0.42;
    act(() => listeners.forEach((fn) => fn()));
    const filled = bars.filter((b) => b.style.transform === "scaleY(1)").length;
    expect(filled).toBeGreaterThan(0);
    expect(filled).toBeLessThan(bars.length);

    progress.current = 0.5;
    act(() => listeners.forEach((fn) => fn()));
    expect(screen.getByText(String(MAYA_SESSION.formScore))).toBeInTheDocument();
    expect(bars.every((b) => b.style.transform === "scaleY(1)")).toBe(true);

    // It holds through the rest of the chapter.
    progress.current = 0.62;
    act(() => listeners.forEach((fn) => fn()));
    expect(screen.getByText(String(MAYA_SESSION.formScore))).toBeInTheDocument();
  });
});

describe("PlanScreen", () => {
  it("lists the exercises", () => {
    render(<PlanScreen />);
    for (const name of ["Squats", "Hamstring stretch", "Split squats"]) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText("Good morning, Maya")).toBeInTheDocument();
    expect(document.querySelector('img[src*="maya.webp"]')).not.toBeNull();
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
