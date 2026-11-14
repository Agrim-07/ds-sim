import { readJsonBody } from '../http/body.js';
import { requireUser } from '../http/guards.js';
import { sendJson, sendNoContent } from '../http/responses.js';

const BODY_LIMIT = 2 * 1024;

export class HistoryController {
  #history;

  constructor({ history }) {
    this.#history = history;
  }

  routes(router) {
    router.on('GET', '/api/history', (ctx) => this.#list(ctx));
    router.on('POST', '/api/history', (ctx) => this.#record(ctx));
    router.on('DELETE', '/api/history', (ctx) => this.#clear(ctx));
  }

  #list(ctx) {
    const user = requireUser(ctx);
    sendJson(ctx.res, 200, { sessions: this.#history.list(user.id) });
  }

  async #record(ctx) {
    const user = requireUser(ctx);
    const session = await this.#history.record(user.id, await readJsonBody(ctx.req, BODY_LIMIT));
    sendJson(ctx.res, 201, { session });
  }

  async #clear(ctx) {
    const user = requireUser(ctx);
    await this.#history.clear(user.id);
    sendNoContent(ctx.res);
  }
}
