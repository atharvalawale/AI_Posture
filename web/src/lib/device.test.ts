import { afterEach, describe, expect, it, vi } from "vitest";
import { hasWebGL2, resetWebGL2Probe } from "./device";

afterEach(() => {
  vi.restoreAllMocks();
  resetWebGL2Probe();
});

describe("hasWebGL2", () => {
  it("is true when the browser gives a WebGL 2 context, and releases the probe", () => {
    const loseContext = vi.fn();
    const gl = { getExtension: () => ({ loseContext }) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => gl as never);
    expect(hasWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });

  it("is false without WebGL 2, or when asking for it throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
    expect(hasWebGL2()).toBe(false);
    resetWebGL2Probe();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasWebGL2()).toBe(false);
  });
});
