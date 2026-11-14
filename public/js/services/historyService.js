import { localStore } from '../core/localStore.js';

const GUEST_KEY = 'ds-sim.guest-history';
const MAX_SESSIONS = 30;
const MAX_OPS = 200;

export class LocalHistoryStore {
  async list() {
    return localStore.read(GUEST_KEY, []);
  }

  async record(entry) {
    const sessions = await this.list();
    const now = Date.now();
    let session = sessions.find((item) => item.id === entry.sessionId);
    if (!session) {
      session = { id: entry.sessionId, structure: entry.structure, label: entry.label, startedAt: now, updatedAt: now, ops: [] };
      sessions.push(session);
    }
    if (session.ops.length >= MAX_OPS) return;
    session.ops.push({ op: entry.op, args: entry.args, at: now });
    session.updatedAt = now;
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    localStore.write(GUEST_KEY, sessions.slice(0, MAX_SESSIONS));
  }

  async clear() {
    localStore.remove(GUEST_KEY);
  }
}

export class RemoteHistoryStore {
  #api;

  constructor(api) {
    this.#api = api;
  }

  async list() {
    return (await this.#api.get('/api/history')).sessions;
  }

  async record(entry) {
    await this.#api.post('/api/history', entry);
  }

  async clear() {
    await this.#api.delete('/api/history');
  }
}

/** Records every simulated operation to the right store for the current user. */
export class HistoryService {
  #local;
  #remote;
  #session;
  #bus;
  #warned = false;

  constructor({ local, remote, session, bus }) {
    this.#local = local;
    this.#remote = remote;
    this.#session = session;
    this.#bus = bus;
  }

  list() {
    return this.#store().list();
  }

  clear() {
    return this.#store().clear();
  }

  async record(entry) {
    try {
      await this.#store().record(entry);
    } catch (error) {
      if (!this.#warned) {
        this.#warned = true;
        this.#bus.emit('notify', { kind: 'error', text: `History is not being saved: ${error.message}` });
      }
    }
  }

  #store() {
    return this.#session.isSignedIn ? this.#remote : this.#local;
  }
}
