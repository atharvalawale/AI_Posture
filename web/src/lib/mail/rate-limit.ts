/**
 * Fixed-size sliding window per key, kept in memory.
 *
 * On serverless hosts each instance keeps its own window, so the real limit is "max per instance".
 * That is enough to stop a single noisy client; it is not a hard global quota.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit for `key`. Returns true when the hit is allowed. Rejected hits are not counted. */
  hit(key: string, now: number = Date.now()): boolean {
    if (this.hits.size > 10_000) this.sweep(now);
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    const allowed = recent.length < this.max;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    return allowed;
  }

  /** Drops keys whose hits have all left the window. */
  sweep(now: number = Date.now()): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}

/**
 * The client's address as reported by the host. Vercel sets both headers itself and overwrites
 * any value the client sends, so they cannot be spoofed there. Unknown clients share one bucket.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
