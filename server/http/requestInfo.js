/** Client IP. With a trusted reverse proxy, the right-most X-Forwarded-For entry is the one the proxy itself saw. */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (forwarded.length > 0) return forwarded[forwarded.length - 1];
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Blocks cross-site state-changing requests (CSRF). Browsers always send Origin on
 * cross-origin POST/PUT/DELETE; Sec-Fetch-Site covers browsers that omit Origin.
 */
export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  }
  const site = req.headers['sec-fetch-site'];
  return site === undefined || site === 'same-origin' || site === 'none';
}
