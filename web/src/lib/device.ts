export type DeviceEnv = { webgl2: boolean; deviceMemory?: number; cores?: number; reducedMotion: boolean };

/**
 * Whether the device should get the 3D phone: WebGL2, at least 4 GB of memory and 4 cores
 * when the browser reports them, and no reduced-motion preference.
 */
export function canUse3D(env: DeviceEnv): boolean {
  if (!env.webgl2 || env.reducedMotion) return false;
  if (env.deviceMemory !== undefined && env.deviceMemory < 4) return false;
  if (env.cores !== undefined && env.cores < 4) return false;
  return true;
}

let webgl2: boolean | undefined;

function hasWebGL2(): boolean {
  if (webgl2 === undefined) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      webgl2 = !!gl;
      // Release the probe context right away: browsers cap live WebGL contexts.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

/** Reads the device capabilities. Browser only. */
export function readDeviceEnv(): DeviceEnv {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    webgl2: hasWebGL2(),
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    cores: typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : undefined,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
