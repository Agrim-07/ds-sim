export class SessionService {
  #api;
  #bus;
  user = null;

  constructor(api, bus) {
    this.#api = api;
    this.#bus = bus;
  }

  get isSignedIn() {
    return this.user !== null;
  }

  async restore() {
    try {
      const { user } = await this.#api.get('/api/auth/me');
      this.#setUser(user);
    } catch {
      this.#setUser(null);
    }
  }

  async signIn(username, password) {
    const { user } = await this.#api.post('/api/auth/login', { username, password });
    this.#setUser(user);
    return user;
  }

  async register(username, password) {
    const { user } = await this.#api.post('/api/auth/register', { username, password });
    this.#setUser(user);
    return user;
  }

  async signOut() {
    await this.#api.post('/api/auth/logout');
    this.#setUser(null);
  }

  exportData() {
    return this.#api.get('/api/account/export');
  }

  async deleteAccount(password) {
    await this.#api.delete('/api/account', { password });
    this.#setUser(null);
  }

  #setUser(user) {
    this.user = user ?? null;
    this.#bus.emit('session:changed', this.user);
  }
}
