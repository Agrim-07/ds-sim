import crypto from 'node:crypto';
import { AppError, conflict } from '../errors.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const toPublicUser = (record) => ({ id: record.id, username: record.username, createdAt: record.createdAt });

export class AuthService {
  #users;
  #sessions;
  #hasher;
  #sessionTtlMs;
  #clock;
  #decoyHash = null;

  constructor({ users, sessions, hasher, sessionTtlMs, clock = Date.now }) {
    this.#users = users;
    this.#sessions = sessions;
    this.#hasher = hasher;
    this.#sessionTtlMs = sessionTtlMs;
    this.#clock = clock;
  }

  async register({ username, password }) {
    if (this.#users.findIdByUsername(username)) throw conflict('That username is already taken.');
    const passwordHash = await this.#hasher.hash(password);
    return this.#users.create({ username, passwordHash, createdAt: this.#clock() });
  }

  async signIn({ username, password }) {
    const id = this.#users.findIdByUsername(username);
    const record = id ? this.#users.getById(id) : null;
    // Hash against a decoy when the user does not exist so response time does not reveal valid usernames.
    const storedHash = record ? record.passwordHash : await this.#getDecoyHash();
    const valid = await this.#hasher.verify(password, storedHash);
    if (!record || !valid) throw new AppError(401, 'Invalid username or password.');
    return { user: toPublicUser(record), token: await this.startSession(record.id) };
  }

  async startSession(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    await this.#sessions.create(hashToken(token), { userId, expiresAt: this.#clock() + this.#sessionTtlMs });
    return token;
  }

  resolveSession(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
    const session = this.#sessions.find(hashToken(token));
    if (!session || session.expiresAt <= this.#clock()) return null;
    const record = this.#users.getById(session.userId);
    return record ? toPublicUser(record) : null;
  }

  async signOut(token) {
    if (typeof token === 'string' && token.length <= 100) await this.#sessions.delete(hashToken(token));
  }

  async verifyPassword(userId, password) {
    const record = this.#users.getById(userId);
    if (!record || typeof password !== 'string' || password.length > 128) return false;
    return this.#hasher.verify(password, record.passwordHash);
  }

  purgeExpiredSessions() {
    return this.#sessions.purgeExpired(this.#clock());
  }

  async #getDecoyHash() {
    this.#decoyHash ??= await this.#hasher.hash(crypto.randomBytes(16).toString('hex'));
    return this.#decoyHash;
  }
}
