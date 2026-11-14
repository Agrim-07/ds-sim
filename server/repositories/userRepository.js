import crypto from 'node:crypto';
import { conflict } from '../errors.js';

/**
 * Stores accounts. Everything about a user is encrypted; the only plaintext
 * is a keyed hash of the lower-cased username, used to find the account at sign-in.
 */
export class UserRepository {
  #store;
  #cipher;

  constructor(store, cipher) {
    this.#store = store;
    this.#cipher = cipher;
  }

  findIdByUsername(username) {
    const lookup = this.#lookupKey(username);
    return this.#store.read((data) => (Object.hasOwn(data.usernameIndex, lookup) ? data.usernameIndex[lookup] : null));
  }

  getById(id) {
    const row = this.#store.read((data) => (Object.hasOwn(data.users, id) ? data.users[id] : null));
    if (!row) return null;
    const secret = this.#cipher.decrypt(this.#scope(id), row.data);
    return { id, ...secret };
  }

  create({ username, passwordHash, createdAt }) {
    const id = crypto.randomUUID();
    const lookup = this.#lookupKey(username);
    const data = this.#cipher.encrypt(this.#scope(id), { username, passwordHash, createdAt });
    return this.#store.update((state) => {
      if (Object.hasOwn(state.usernameIndex, lookup)) throw conflict('That username is already taken.');
      state.users[id] = { lookup, data };
      state.usernameIndex[lookup] = id;
      return { id, username, createdAt };
    });
  }

  delete(id) {
    return this.#store.update((state) => {
      if (!Object.hasOwn(state.users, id)) return false;
      delete state.usernameIndex[state.users[id].lookup];
      delete state.users[id];
      return true;
    });
  }

  #lookupKey(username) {
    return this.#cipher.blindIndex(`username:${username.toLowerCase()}`);
  }

  #scope(id) {
    return `users:${id}`;
  }
}
