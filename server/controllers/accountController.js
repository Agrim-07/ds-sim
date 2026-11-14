import { readJsonBody } from '../http/body.js';
import { requireUser } from '../http/guards.js';
import { sendJson, sendNoContent } from '../http/responses.js';

export class AccountController {
  #account;
  #cookie;

  constructor({ account, cookie }) {
    this.#account = account;
    this.#cookie = cookie;
  }

  routes(router) {
    router.on('GET', '/api/account/export', (ctx) => this.#export(ctx));
    router.on('DELETE', '/api/account', (ctx) => this.#delete(ctx));
  }

  #export(ctx) {
    const user = requireUser(ctx);
    sendJson(ctx.res, 200, this.#account.exportData(user), {
      'Content-Disposition': 'attachment; filename="ds-sim-my-data.json"',
    });
  }

  async #delete(ctx) {
    const user = requireUser(ctx);
    const { password } = await readJsonBody(ctx.req, 1024);
    await this.#account.deleteAccount(user.id, password);
    sendNoContent(ctx.res, { 'Set-Cookie': this.#cookie.clear() });
  }
}
