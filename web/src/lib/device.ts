let webgl2: boolean | undefined;

/**
 * Whether the browser can draw WebGL 2, which the 3D phone needs. Every device that can gets the
 * 3D phone, whatever its memory, cores or motion setting. Browser only.
 */
export function hasWebGL2(): boolean {
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

/** Forgets the probe result. For tests. */
export function resetWebGL2Probe() {
  webgl2 = undefined;
}
