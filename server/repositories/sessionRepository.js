/** Sessions are keyed by a SHA-256 hash of the token, so the raw token never touches disk. */
export class SessionRepository {
  #store;

  constructor(store) {
    this.#store = store;
  }

  find(tokenHash) {
    return this.#store.read((data) => (Object.hasOwn(data.sessions, tokenHash) ? data.sessions[tokenHash] : null));
  }

  create(tokenHash, session) {
    return this.#store.update((data) => {
      data.sessions[tokenHash] = session;
    });
  }

  delete(tokenHash) {
    return this.#store.update((data) => {
      delete data.sessions[tokenHash];
    });
  }

  deleteForUser(userId) {
    return this.#store.update((data) => {
      for (const [hash, session] of Object.entries(data.sessions)) {
        if (session.userId === userId) delete data.sessions[hash];
      }
    });
  }

  purgeExpired(now) {
    return this.#store.update((data) => {
      let removed = 0;
      for (const [hash, session] of Object.entries(data.sessions)) {
        if (session.expiresAt <= now) {
          delete data.sessions[hash];
          removed += 1;
        }
      }
      return removed;
    });
  }
}
