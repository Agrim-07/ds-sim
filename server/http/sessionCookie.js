import { parseCookies, serializeCookie } from './cookies.js';

export class SessionCookie {
  #secure;
  #maxAgeSeconds;

  constructor({ secureCookies, sessionTtlMs }) {
    this.#secure = secureCookies;
    this.#maxAgeSeconds = sessionTtlMs / 1000;
    // The __Host- prefix makes browsers refuse the cookie unless it is Secure, host-only and Path=/.
    this.name = secureCookies ? '__Host-dssid' : 'dssid';
  }

  read(req) {
    return parseCookies(req.headers.cookie)[this.name] ?? null;
  }

  issue(token) {
    return serializeCookie(this.name, token, { maxAgeSeconds: this.#maxAgeSeconds, secure: this.#secure });
  }

  clear() {
    return serializeCookie(this.name, '', { maxAgeSeconds: 0, secure: this.#secure });
  }
}
