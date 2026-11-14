import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  return Object.freeze({
    rootDir: ROOT_DIR,
    publicDir: path.join(ROOT_DIR, 'public'),
    dataDir: path.resolve(ROOT_DIR, env.DATA_DIR || 'data'),
    host: env.HOST || '127.0.0.1',
    port: readInt(env.PORT, 3000),
    masterKey: env.DS_SIM_MASTER_KEY || '',
    secureCookies: readBool(env.COOKIE_SECURE, isProduction),
    trustProxy: readBool(env.TRUST_PROXY, false),
    sessionTtlMs: readInt(env.SESSION_TTL_HOURS, 168) * 60 * 60 * 1000,
    isProduction,
  });
}
