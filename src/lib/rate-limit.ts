/** Sliding-window limiter: returns how many calls remain and when the window frees up. */
export function checkRateLimit(timestamps: number[], now: number, max: number, windowMs: number) {
  const recent = timestamps.filter((t) => now - t < windowMs);
  const allowed = recent.length < max;
  const retryInMs = allowed ? 0 : windowMs - (now - Math.min(...recent));
  return { allowed, recent: allowed ? [...recent, now] : recent, remaining: Math.max(0, max - recent.length - (allowed ? 1 : 0)), retryInMs };
}

export const SEARCH_LIMIT = { max: 10, windowMs: 60_000 };
