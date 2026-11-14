import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const DEFAULT_COST = Object.freeze({ N: 16384, r: 8, p: 1 });
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

export class PasswordHasher {
  #cost;

  constructor(cost = DEFAULT_COST) {
    this.#cost = cost;
  }

  async hash(password) {
    const salt = crypto.randomBytes(SALT_BYTES);
    const { N, r, p } = this.#cost;
    const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEMORY });
    return ['scrypt', N, r, p, salt.toString('base64'), derived.toString('base64')].join('$');
  }

  async verify(password, stored) {
    const [scheme, N, r, p, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const derived = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    });
    return crypto.timingSafeEqual(derived, expected);
  }
}
