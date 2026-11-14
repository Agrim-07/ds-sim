import { readJsonBody } from '../http/body.js';
import { requireUser } from '../http/guards.js';
import { sendJson } from '../http/responses.js';

const BODY_LIMIT = 32 * 1024;

export class ProgressController {
  #progress;

  constructor({ progress }) {
    this.#progress = progress;
  }

  routes(router) {
    router.on('GET', '/api/progress', (ctx) => this.#get(ctx));
    router.on('PUT', '/api/progress', (ctx) => this.#save(ctx));
  }

  #get(ctx) {
    const user = requireUser(ctx);
    sendJson(ctx.res, 200, { progress: this.#progress.get(user.id) });
  }

  async #save(ctx) {
    const user = requireUser(ctx);
    const progress = await this.#progress.save(user.id, await readJsonBody(ctx.req, BODY_LIMIT));
    sendJson(ctx.res, 200, { progress });
  }
}
