import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import { DataCipher } from '../server/security/dataCipher.js';
import { PasswordHasher } from '../server/security/passwordHasher.js';
import { RateLimiter } from '../server/security/rateLimiter.js';
import { parseCookies, serializeCookie } from '../server/http/cookies.js';

describe('DataCipher', () => {
  const cipher = new DataCipher(crypto.randomBytes(32));

  it('round-trips JSON values', () => {
    const value = { xp: 10, list: [1, 'two'], nested: { ok: true } };
    assert.deepEqual(cipher.decrypt('progress:u1', cipher.encrypt('progress:u1', value)), value);
  });

  it('uses a fresh IV, so equal values encrypt differently', () => {
    assert.notEqual(cipher.encrypt('s', 'same'), cipher.encrypt('s', 'same'));
  });

  it('refuses to decrypt a record under a different scope', () => {
    const payload = cipher.encrypt('progress:u1', { xp: 1 });
    assert.throws(() => cipher.decrypt('progress:u2', payload));
  });

  it('detects tampering', () => {
    const [version, iv, tag, body] = cipher.encrypt('s', { secret: 'value' }).split('.');
    const flipped = Buffer.from(body, 'base64');
    flipped[0] ^= 1;
    assert.throws(() => cipher.decrypt('s', [version, iv, tag, flipped.toString('base64')].join('.')));
  });

  it('cannot be opened with another master key', () => {
    const other = new DataCipher(crypto.randomBytes(32));
    assert.throws(() => other.decrypt('s', cipher.encrypt('s', 1)));
  });

  it('builds stable blind indexes', () => {
    assert.equal(cipher.blindIndex('a'), cipher.blindIndex('a'));
    assert.notEqual(cipher.blindIndex('a'), cipher.blindIndex('b'));
  });
});

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher({ N: 1024, r: 8, p: 1 });

  it('verifies the right password and rejects others', async () => {
    const stored = await hasher.hash('open sesame');
    assert.equal(await hasher.verify('open sesame', stored), true);
    assert.equal(await hasher.verify('open sesam', stored), false);
  });

  it('salts every hash', async () => {
    assert.notEqual(await hasher.hash('same'), await hasher.hash('same'));
  });

  it('rejects unknown hash formats', async () => {
    assert.equal(await hasher.verify('x', 'md5$abc'), false);
  });
});

describe('RateLimiter', () => {
  it('allows up to max hits per window', () => {
    let now = 0;
    const limiter = new RateLimiter({ windowMs: 1000, max: 2, clock: () => now });
    assert.equal(limiter.consume('k').allowed, true);
    assert.equal(limiter.consume('k').allowed, true);
    assert.equal(limiter.consume('k').allowed, false);
    now = 1001;
    assert.equal(limiter.consume('k').allowed, true);
  });
});

describe('cookies', () => {
  it('parses and serialises cookies', () => {
    assert.deepEqual({ ...parseCookies('a=1; b=hello%20world') }, { a: '1', b: 'hello world' });
    assert.equal(serializeCookie('s', 'v', { maxAgeSeconds: 60, secure: true }), 's=v; Path=/; SameSite=Strict; Max-Age=60; HttpOnly; Secure');
  });
});
