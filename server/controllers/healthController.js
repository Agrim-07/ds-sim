import { sendJson } from '../http/responses.js';

export class HealthController {
  routes(router) {
    router.on('GET', '/api/health', ({ res }) => sendJson(res, 200, { status: 'ok' }));
  }
}
