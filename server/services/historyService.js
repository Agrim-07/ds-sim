import { conflict } from '../errors.js';
import { LIMITS, validateHistoryEntry } from '../domain/validation.js';

export class HistoryService {
  #repository;
  #clock;

  constructor(repository, clock = Date.now) {
    this.#repository = repository;
    this.#clock = clock;
  }

  list(userId) {
    return this.#repository.get(userId);
  }

  async record(userId, input) {
    const entry = validateHistoryEntry(input);
    const now = this.#clock();
    let saved = null;

    await this.#repository.update(userId, (sessions) => {
      let session = sessions.find((item) => item.id === entry.sessionId);
      if (!session) {
        session = { id: entry.sessionId, structure: entry.structure, label: entry.label, startedAt: now, updatedAt: now, ops: [] };
        sessions.push(session);
      } else if (session.structure !== entry.structure) {
        throw conflict('That session belongs to a different data structure.');
      }
      if (session.ops.length >= LIMITS.opsPerSession) {
        throw conflict('This session is full. Open the structure again to start a new session.');
      }

      session.ops.push({ op: entry.op, args: entry.args, at: now });
      session.updatedAt = now;
      saved = session;

      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      return sessions.slice(0, LIMITS.historySessions);
    });

    return saved;
  }

  clear(userId) {
    return this.#repository.update(userId, () => []);
  }

  remove(userId) {
    return this.#repository.remove(userId);
  }
}
