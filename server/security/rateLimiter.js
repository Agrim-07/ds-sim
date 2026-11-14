/** Fixed-window, in-memory rate limiter keyed by an arbitrary string (IP, IP + username, ...). */
export class RateLimiter {
  #windowMs;
  #max;
  #clock;
  #hits = new Map();

  constructor({ windowMs, max, clock = Date.now }) {
    this.#windowMs = windowMs;
    this.#max = max;
    this.#clock = clock;
  }

  consume(key) {
    const now = this.#clock();
    let entry = this.#hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.#windowMs };
      this.#hits.set(key, entry);
    }
    entry.count += 1;
    if (this.#hits.size > 10_000) this.#sweep(now);
    return { allowed: entry.count <= this.#max, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }

  reset(key) {
    this.#hits.delete(key);
  }

  #sweep(now) {
    for (const [key, entry] of this.#hits) {
      if (entry.resetAt <= now) this.#hits.delete(key);
    }
  }
}
