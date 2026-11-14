import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_VERSION = 'v1';

/**
 * Authenticated encryption for stored records.
 * Every record gets its own key, derived from the master key and the record's scope
 * (for example "progress:<userId>"), and the scope is bound as associated data so a
 * ciphertext copied onto another record fails to decrypt.
 */
export class DataCipher {
  #masterKey;
  #keyCache = new Map();

  constructor(masterKey) {
    if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) {
      throw new Error('DataCipher needs a 32-byte master key.');
    }
    this.#masterKey = masterKey;
  }

  encrypt(scope, value) {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.#keyFor(scope), iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(Buffer.from(scope, 'utf8'));
    const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [FORMAT_VERSION, iv.toString('base64'), tag.toString('base64'), body.toString('base64')].join('.');
  }

  decrypt(scope, payload) {
    const [version, iv, tag, body] = String(payload).split('.');
    if (version !== FORMAT_VERSION || !iv || !tag || body === undefined) {
      throw new Error('Unrecognised ciphertext format.');
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, this.#keyFor(scope), Buffer.from(iv, 'base64'), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(scope, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const plain = Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]);
    return JSON.parse(plain.toString('utf8'));
  }

  /** Deterministic keyed hash used to look records up without storing the plaintext value. */
  blindIndex(value) {
    return crypto.createHmac('sha256', this.#keyFor('blind-index')).update(value, 'utf8').digest('hex');
  }

  #keyFor(scope) {
    let key = this.#keyCache.get(scope);
    if (!key) {
      key = Buffer.from(crypto.hkdfSync('sha256', this.#masterKey, Buffer.from(scope, 'utf8'), 'ds-sim/record', 32));
      if (this.#keyCache.size > 5000) this.#keyCache.clear();
      this.#keyCache.set(scope, key);
    }
    return key;
  }
}
