import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const KEY_BYTES = 32;

export function decodeKey(encoded) {
  const key = Buffer.from(String(encoded).trim(), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`The master key must be ${KEY_BYTES} random bytes encoded as base64 (run "npm run keygen").`);
  }
  return key;
}

export function loadMasterKey({ masterKey, dataDir, isProduction }) {
  if (masterKey) return decodeKey(masterKey);
  if (isProduction) {
    throw new Error('DS_SIM_MASTER_KEY must be set when NODE_ENV=production.');
  }

  const keyFile = path.join(dataDir, 'master.key');
  if (fs.existsSync(keyFile)) return decodeKey(fs.readFileSync(keyFile, 'utf8'));

  fs.mkdirSync(dataDir, { recursive: true });
  const key = crypto.randomBytes(KEY_BYTES);
  fs.writeFileSync(keyFile, key.toString('base64'), { mode: 0o600, flag: 'wx' });
  return key;
}
