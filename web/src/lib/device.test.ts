// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canUse3D } from "./device";

describe("canUse3D", () => {
  const ok = { webgl2: true, reducedMotion: false };

  it("accepts a capable device", () => {
    expect(canUse3D(ok)).toBe(true);
    expect(canUse3D({ ...ok, deviceMemory: 4, cores: 4 })).toBe(true);
    expect(canUse3D({ ...ok, deviceMemory: 8, cores: 12 })).toBe(true);
  });

  it("rejects devices without WebGL2", () => {
    expect(canUse3D({ ...ok, webgl2: false })).toBe(false);
  });

  it("rejects low memory", () => {
    expect(canUse3D({ ...ok, deviceMemory: 2 })).toBe(false);
  });

  it("rejects few cores", () => {
    expect(canUse3D({ ...ok, cores: 2 })).toBe(false);
  });

  it("rejects reduced motion", () => {
    expect(canUse3D({ ...ok, reducedMotion: true })).toBe(false);
  });
});
