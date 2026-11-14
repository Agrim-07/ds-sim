import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { startTestServer } from './helpers.js';

const CREDENTIALS = { username: 'ada_l', password: 'analytical-engine' };

describe('HTTP API', () => {
  let app;

  before(async () => {
    app = await startTestServer();
  });

  after(async () => {
    await app.close();
  });

  it('reports health', async () => {
    const res = await app.client()('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('sends security headers on every response', async () => {
    const res = await app.client()('GET', '/api/health');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  });

  it('registers, signs in, and keeps the session in an HttpOnly cookie', async () => {
    const request = app.client();
    const created = await request('POST', '/api/auth/register', CREDENTIALS);
    assert.equal(created.status, 201);
    assert.equal(created.body.user.username, CREDENTIALS.username);
    assert.match(created.headers.get('set-cookie'), /HttpOnly; *|HttpOnly$/);
    assert.match(created.headers.get('set-cookie'), /SameSite=Strict/);

    const me = await request('GET', '/api/auth/me');
    assert.equal(me.body.user.username, CREDENTIALS.username);
  });

  it('rejects duplicate usernames regardless of case', async () => {
    const res = await app.client()('POST', '/api/auth/register', { ...CREDENTIALS, username: 'ADA_L' });
    assert.equal(res.status, 409);
  });

  it('rejects weak or malformed credentials', async () => {
    const request = app.client();
    assert.equal((await request('POST', '/api/auth/register', { username: 'x', password: 'longenough' })).status, 400);
    assert.equal((await request('POST', '/api/auth/register', { username: 'bobby', password: 'short' })).status, 400);
    assert.equal((await request('POST', '/api/auth/register', { username: 'bobby', password: 'bobby-is-cool' })).status, 400);
  });

  it('gives the same error for a wrong password and an unknown user', async () => {
    const request = app.client();
    const wrongPassword = await request('POST', '/api/auth/login', { ...CREDENTIALS, password: 'not-the-password' });
    const unknownUser = await request('POST', '/api/auth/login', { username: 'nobody_here', password: 'whatever123' });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.equal(wrongPassword.body.error, unknownUser.body.error);
  });

  it('saves and validates progress for the signed-in user only', async () => {
    const request = app.client();
    assert.equal((await request('GET', '/api/progress')).status, 401);
    await request('POST', '/api/auth/login', CREDENTIALS);

    const progress = { xp: 90, completed: [{ id: 'first-steps', stars: 3, at: 1700000000000 }], settings: { theme: 'dark', sound: false } };
    const saved = await request('PUT', '/api/progress', progress);
    assert.equal(saved.status, 200);
    assert.deepEqual((await request('GET', '/api/progress')).body.progress, progress);

    const invalid = await request('PUT', '/api/progress', { xp: -5, completed: [] });
    assert.equal(invalid.status, 400);
  });

  it('records simulation history grouped by session', async () => {
    const request = app.client();
    await request('POST', '/api/auth/login', CREDENTIALS);
    const entry = { sessionId: 'session-001', structure: 'stack', op: 'push', args: [7], label: 'Sandbox' };
    assert.equal((await request('POST', '/api/history', entry)).status, 201);
    await request('POST', '/api/history', { ...entry, op: 'pop', args: [] });

    const { body } = await request('GET', '/api/history');
    assert.equal(body.sessions.length, 1);
    assert.deepEqual(body.sessions[0].ops.map((op) => op.op), ['push', 'pop']);

    const bad = await request('POST', '/api/history', { ...entry, args: ['<script>'] });
    assert.equal(bad.status, 400);
  });

  it('blocks cross-site state-changing requests', async () => {
    const request = app.client();
    await request('POST', '/api/auth/login', CREDENTIALS);
    const res = await request('PUT', '/api/progress', { xp: 0, completed: [] }, { Origin: 'https://evil.example' });
    assert.equal(res.status, 403);
  });

  it('requires JSON request bodies and limits their size', async () => {
    const request = app.client();
    const wrongType = await request('POST', '/api/auth/login', 'username=a', { 'Content-Type': 'application/x-www-form-urlencoded' });
    assert.equal(wrongType.status, 415);
    const huge = await request('POST', '/api/auth/login', { username: 'a', password: 'x'.repeat(10_000) });
    assert.equal(huge.status, 413);
  });

  it('stores no plaintext usernames, progress or history on disk', async () => {
    const raw = await fs.readFile(path.join(app.dataDir, 'db.json'), 'utf8');
    assert.ok(!raw.includes(CREDENTIALS.username));
    assert.ok(!raw.includes('first-steps'));
    assert.ok(!raw.includes('"push"'));
    assert.ok(!raw.includes('scrypt$'));
  });

  it('does not serve files outside the public folder', async () => {
    const request = app.client();
    assert.equal((await request('GET', '/%2e%2e/package.json')).status, 404);
    assert.equal((await request('GET', '/..%2fserver%2findex.js')).status, 404);
    assert.equal((await request('GET', '/index.html')).status, 200);
  });

  it('lets browsers revalidate cached static files', async () => {
    const request = app.client();
    const first = await request('GET', '/css/styles.css');
    assert.equal(first.headers.get('cache-control'), 'no-cache');
    const again = await request('GET', '/css/styles.css', undefined, { 'If-Modified-Since': first.headers.get('last-modified') });
    assert.equal(again.status, 304);
  });

  it('exports and then permanently deletes an account', async () => {
    const request = app.client();
    await request('POST', '/api/auth/login', CREDENTIALS);
    const exported = await request('GET', '/api/account/export');
    assert.equal(exported.status, 200);
    assert.equal(exported.body.account.username, CREDENTIALS.username);

    assert.equal((await request('DELETE', '/api/account', { password: 'wrong-password' })).status, 403);
    assert.equal((await request('DELETE', '/api/account', { password: CREDENTIALS.password })).status, 204);
    assert.equal((await request('GET', '/api/auth/me')).body.user, null);
    assert.equal((await app.client()('POST', '/api/auth/login', CREDENTIALS)).status, 401);
  });

  it('signs out by revoking the session server-side', async () => {
    const request = app.client();
    await request('POST', '/api/auth/register', { username: 'grace_h', password: 'compiler-pioneer' });
    assert.equal((await request('POST', '/api/auth/logout')).status, 204);
    assert.equal((await request('GET', '/api/auth/me')).body.user, null);
  });
});
