import { forbidden } from '../errors.js';

/** Data-subject features: export everything we hold about a user, or erase it. */
export class AccountService {
  #auth;
  #users;
  #sessions;
  #progress;
  #history;
  #clock;

  constructor({ auth, users, sessions, progress, history, clock = Date.now }) {
    this.#auth = auth;
    this.#users = users;
    this.#sessions = sessions;
    this.#progress = progress;
    this.#history = history;
    this.#clock = clock;
  }

  exportData(user) {
    return {
      exportedAt: new Date(this.#clock()).toISOString(),
      account: { username: user.username, createdAt: new Date(user.createdAt).toISOString() },
      progress: this.#progress.get(user.id),
      history: this.#history.list(user.id),
    };
  }

  async deleteAccount(userId, password) {
    if (!(await this.#auth.verifyPassword(userId, password))) {
      throw forbidden('That password is not correct.');
    }
    await this.#sessions.deleteForUser(userId);
    await this.#progress.remove(userId);
    await this.#history.remove(userId);
    await this.#users.delete(userId);
  }
}
