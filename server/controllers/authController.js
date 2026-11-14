import { AppError } from '../errors.js';
import { readJsonBody } from '../http/body.js';
import { sendJson, sendNoContent } from '../http/responses.js';
import { validateCredentials } from '../domain/validation.js';

const BODY_LIMIT = 4 * 1024;

export class AuthController {
  #auth;
  #cookie;
  #limiters;

  /** limiters: { signIn, signInPerUser, register } — each a RateLimiter. */
  constructor({ auth, cookie, limiters }) {
    this.#auth = auth;
    this.#cookie = cookie;
    this.#limiters = limiters;
  }

  routes(router) {
    router.on('POST', '/api/auth/register', (ctx) => this.#register(ctx));
    router.on('POST', '/api/auth/login', (ctx) => this.#signIn(ctx));
    router.on('POST', '/api/auth/logout', (ctx) => this.#signOut(ctx));
    router.on('GET', '/api/auth/me', (ctx) => this.#me(ctx));
  }

  async #register({ req, res, ip }) {
    this.#throttle(this.#limiters.register, `register:${ip}`);
    const credentials = validateCredentials(await readJsonBody(req, BODY_LIMIT));
    const user = await this.#auth.register(credentials);
    const token = await this.#auth.startSession(user.id);
    sendJson(res, 201, { user }, { 'Set-Cookie': this.#cookie.issue(token) });
  }

  async #signIn({ req, res, ip }) {
    this.#throttle(this.#limiters.signIn, `login:${ip}`);
    const credentials = validateCredentials(await readJsonBody(req, BODY_LIMIT), { forSignIn: true });
    const userKey = `login:${ip}:${credentials.username.toLowerCase()}`;
    this.#throttle(this.#limiters.signInPerUser, userKey);

    const { user, token } = await this.#auth.signIn(credentials);
    this.#limiters.signInPerUser.reset(userKey);
    sendJson(res, 200, { user }, { 'Set-Cookie': this.#cookie.issue(token) });
  }

  async #signOut({ res, token }) {
    await this.#auth.signOut(token);
    sendNoContent(res, { 'Set-Cookie': this.#cookie.clear() });
  }

  #me({ res, user }) {
    sendJson(res, 200, { user });
  }

  #throttle(limiter, key) {
    const { allowed, retryAfterMs } = limiter.consume(key);
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000);
      throw new AppError(429, `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`, {
        'Retry-After': String(seconds),
      });
    }
  }
}
