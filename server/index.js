import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createRequestHandler } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { AccountController } from './controllers/accountController.js';
import { AuthController } from './controllers/authController.js';
import { HealthController } from './controllers/healthController.js';
import { HistoryController } from './controllers/historyController.js';
import { ProgressController } from './controllers/progressController.js';
import { createDefaultHistory, createDefaultProgress } from './domain/defaults.js';
import { Router } from './http/router.js';
import { SessionCookie } from './http/sessionCookie.js';
import { createStaticHandler } from './http/staticFiles.js';
import { EncryptedDocumentRepository } from './repositories/encryptedDocumentRepository.js';
import { SessionRepository } from './repositories/sessionRepository.js';
import { UserRepository } from './repositories/userRepository.js';
import { DataCipher } from './security/dataCipher.js';
import { loadMasterKey } from './security/keyProvider.js';
import { PasswordHasher } from './security/passwordHasher.js';
import { RateLimiter } from './security/rateLimiter.js';
import { AccountService } from './services/accountService.js';
import { AuthService } from './services/authService.js';
import { HistoryService } from './services/historyService.js';
import { ProgressService } from './services/progressService.js';
import { JsonFileStore } from './storage/jsonFileStore.js';
import { INITIAL_STATE } from './storage/schema.js';

const MINUTE = 60 * 1000;

/** Composition root: the only place that knows which concrete classes are used. */
export async function createServer(config, { logger = createLogger() } = {}) {
  const cipher = new DataCipher(loadMasterKey(config));
  const store = new JsonFileStore(path.join(config.dataDir, 'db.json'), INITIAL_STATE);
  await store.load();

  const users = new UserRepository(store, cipher);
  const sessions = new SessionRepository(store);
  const auth = new AuthService({ users, sessions, hasher: new PasswordHasher(), sessionTtlMs: config.sessionTtlMs });
  const progress = new ProgressService(new EncryptedDocumentRepository(store, cipher, 'progress', createDefaultProgress));
  const history = new HistoryService(new EncryptedDocumentRepository(store, cipher, 'history', createDefaultHistory));
  const account = new AccountService({ auth, users, sessions, progress, history });
  const cookie = new SessionCookie(config);

  const router = new Router();
  const controllers = [
    new HealthController(),
    new AuthController({
      auth,
      cookie,
      limiters: {
        signIn: new RateLimiter({ windowMs: 15 * MINUTE, max: 30 }),
        signInPerUser: new RateLimiter({ windowMs: 15 * MINUTE, max: 8 }),
        register: new RateLimiter({ windowMs: 60 * MINUTE, max: 10 }),
      },
    }),
    new ProgressController({ progress }),
    new HistoryController({ history }),
    new AccountController({ account, cookie }),
  ];
  for (const controller of controllers) controller.routes(router);

  const server = http.createServer(
    createRequestHandler({
      router,
      serveStatic: createStaticHandler(config.publicDir),
      auth,
      cookie,
      apiLimiter: new RateLimiter({ windowMs: MINUTE, max: 300 }),
      config,
      logger,
    }),
  );
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;

  const sweeper = setInterval(() => {
    auth.purgeExpiredSessions().catch((error) => logger.error('Session cleanup failed', { error: error.message }));
  }, 60 * MINUTE);
  sweeper.unref();
  server.on('close', () => clearInterval(sweeper));

  return server;
}

export async function startServer(config = loadConfig(), options = {}) {
  const logger = options.logger ?? createLogger();
  const server = await createServer(config, { logger });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const shutdown = (signal) => {
    logger.info('Shutting down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  logger.info('ds-sim is running', { url: `http://${config.host}:${server.address().port}/` });
  return server;
}

const isEntryPoint = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  startServer().catch((error) => {
    console.error(error.code === 'EADDRINUSE' ? 'That port is already in use. Set PORT to a free port and try again.' : error.message);
    process.exit(1);
  });
}
