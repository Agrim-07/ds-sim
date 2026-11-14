import { localStore } from '../core/localStore.js';

const GUEST_KEY = 'ds-sim.guest-progress';

export const createEmptyProgress = () => ({ xp: 0, completed: [], settings: { theme: 'system', sound: true } });

function normalise(progress) {
  const empty = createEmptyProgress();
  return {
    xp: Number.isInteger(progress?.xp) ? progress.xp : 0,
    completed: Array.isArray(progress?.completed) ? progress.completed : [],
    settings: { ...empty.settings, ...(progress?.settings ?? {}) },
  };
}

/** Progress for visitors without an account, kept in this browser only. */
export class LocalProgressStore {
  async load() {
    return normalise(localStore.read(GUEST_KEY, createEmptyProgress()));
  }

  async save(progress) {
    localStore.write(GUEST_KEY, progress);
    return progress;
  }

  clear() {
    localStore.remove(GUEST_KEY);
  }
}

/** Progress stored (encrypted) on the server for signed-in users. */
export class RemoteProgressStore {
  #api;

  constructor(api) {
    this.#api = api;
  }

  async load() {
    const { progress } = await this.#api.get('/api/progress');
    return normalise(progress);
  }

  async save(progress) {
    const { progress: saved } = await this.#api.put('/api/progress', progress);
    return normalise(saved);
  }
}
