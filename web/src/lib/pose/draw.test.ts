// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { EDGES, JOINTS, MEASURED, drawAngleLabels, drawSkeleton, type PoseClip } from "./index";

const clip = fixture as PoseClip;

function fakeContext() {
  const calls: string[] = [];
  const styles: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get(target: Record<string, unknown>, prop: string) {
        if (prop in target) return target[prop];
        return (...args: unknown[]) => {
          calls.push(prop);
          return args;
        };
      },
      set(target: Record<string, unknown>, prop: string, value: unknown) {
        target[prop] = value;
        if (prop === "strokeStyle" || prop === "fillStyle") styles.push(String(value));
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, styles };
}

describe("drawSkeleton", () => {
  it("draws outline, line, joints and the knee arc with the fixed colors", () => {
    const { ctx, calls, styles } = fakeContext();
    drawSkeleton(ctx, clip, 3, { ox: 0, oy: 0, w: 320, h: 607 }, { arcAt: 25 });
    expect(styles).toContain("rgba(6,20,22,.45)");
    expect(styles).toContain("#5ED6C6");
    expect(styles).toContain("#FFFFFF");
    expect(styles).toContain("#0B5E57");
    expect(calls.filter((c) => c === "lineTo")).toHaveLength(EDGES.length * 2);
    // One circle per joint plus the knee arc.
    expect(calls.filter((c) => c === "arc")).toHaveLength(JOINTS.length + 1);
    expect(ctx.lineWidth).toBe(1.5);
  });

  it("uses a minimum line width of 2", () => {
    const { ctx } = fakeContext();
    const widths: number[] = [];
    Object.defineProperty(ctx, "lineWidth", { set: (v: number) => widths.push(v), get: () => widths.at(-1) });
    drawSkeleton(ctx, clip, 3, { ox: 0, oy: 0, w: 160, h: 300 });
    expect(widths[0]).toBe(4.5);
    expect(widths[1]).toBe(2);
  });
});

describe("drawAngleLabels", () => {
  it("labels each measured joint with its angle in whole degrees", () => {
    const { ctx } = fakeContext();
    const texts: string[] = [];
    Object.assign(ctx, {
      measureText: (t: string) => ({ width: t.length * 6 }),
      fillText: (t: string) => texts.push(t),
    });
    drawAngleLabels(ctx, clip, 3, { ox: 0, oy: 0, w: 320, h: 607 }, "sans-serif");
    expect(texts).toHaveLength(MEASURED.length);
    for (const [i, [name]] of MEASURED.entries()) expect(texts[i]).toMatch(new RegExp(`^${name} \\d{1,3}°$`));
  });
});
