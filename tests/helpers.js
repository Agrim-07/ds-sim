import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadConfig } from '../server/config.js';
import { createServer } from '../server/index.js';
import { createLogger } from '../server/logger.js';

/** Starts an isolated server on a random port with its own temporary data directory. */
export async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ds-sim-test-'));
  const config = {
    ...loadConfig({}),
    dataDir,
    port: 0,
    masterKey: crypto.randomBytes(32).toString('base64'),
    ...overrides,
  };
  const server = await createServer(config, { logger: createLogger({ silent: true }) });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    dataDir,
    client: () => createClient(baseUrl),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

/** Minimal fetch wrapper that remembers the session cookie like a browser would. */
function createClient(baseUrl) {
  let cookie = '';
  return async function request(method, pathname, body, headers = {}) {
    const init = { method, headers: { ...headers } };
    if (cookie) init.headers.Cookie = cookie;
    if (body !== undefined) {
      init.headers['Content-Type'] ??= 'application/json';
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${pathname}`, init);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    const isJson = (response.headers.get('content-type') ?? '').startsWith('application/json');
    return { status: response.status, headers: response.headers, body: text && isJson ? JSON.parse(text) : text || null };
  };
}
