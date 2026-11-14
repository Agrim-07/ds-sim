import { AppError, forbidden, notFound } from './errors.js';
import { clientIp, isSameOrigin } from './http/requestInfo.js';
import { applySecurityHeaders, sendJson } from './http/responses.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createRequestHandler({ router, serveStatic, auth, cookie, apiLimiter, config, logger }) {
  async function handleApi(req, res, url) {
    const ip = clientIp(req, config.trustProxy);
    const { allowed, retryAfterMs } = apiLimiter.consume(ip);
    if (!allowed) {
      throw new AppError(429, 'Too many requests. Please slow down.', { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) });
    }

    const route = router.match(req.method, url.pathname);
    if (!route) throw notFound();
    if (route.methodNotAllowed) throw new AppError(405, 'Method not allowed.', { Allow: route.allowed.join(', ') });
    if (STATE_CHANGING.has(req.method) && !isSameOrigin(req)) throw forbidden('Cross-site request blocked.');

    const token = cookie.read(req);
    const user = token ? auth.resolveSession(token) : null;
    await route.handler({ req, res, url, ip, token, user });
  }

  async function handleStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new AppError(405, 'Method not allowed.', { Allow: 'GET, HEAD' });
    const served = await serveStatic(req, res, url.pathname);
    if (!served) throw notFound();
  }

  function handleError(res, error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof AppError) {
      sendJson(res, error.status, { error: error.message }, error.headers);
      return;
    }
    logger.error('Unhandled error', { error: error?.stack ?? String(error) });
    sendJson(res, 500, { error: 'Something went wrong on our side. Please try again.' });
  }

  return async function handleRequest(req, res) {
    const startedAt = Date.now();
    applySecurityHeaders(res, config);
    let url;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        res.once('finish', () =>
          logger.info('api', { method: req.method, path: url.pathname, status: res.statusCode, ms: Date.now() - startedAt }),
        );
        await handleApi(req, res, url);
      } else {
        await handleStatic(req, res, url);
      }
    } catch (error) {
      handleError(res, error);
    }
  };
}
