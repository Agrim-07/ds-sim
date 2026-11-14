import { createEmptyProgress } from './progressStores.js';

/**
 * Owns the learner's progress and decides where it lives: in the browser for guests,
 * on the server for signed-in users. When a guest signs in, their guest progress is merged
 * into the account so nothing they earned is lost.
 */
export class ProgressService {
  #local;
  #remote;
  #bus;
  #xpFor;
  #store;
  progress = createEmptyProgress();

  /** xpFor(missionId, stars) turns completions into XP, so XP can always be recomputed. */
  constructor({ local, remote, bus, xpFor }) {
    this.#local = local;
    this.#remote = remote;
    this.#bus = bus;
    this.#xpFor = xpFor;
    this.#store = local;
  }

  async useAccount(signedIn) {
    if (!signedIn) {
      this.#store = this.#local;
      this.progress = await this.#local.load();
    } else {
      this.#store = this.#remote;
      const [account, guest] = await Promise.all([this.#remote.load(), this.#local.load()]);
      this.progress = account;
      if (guest.completed.length > 0) {
        this.progress = this.#merge(account, guest);
        await this.#save();
        this.#local.clear();
        this.#bus.emit('notify', { kind: 'success', text: 'Your guest progress was added to your account.' });
      }
    }
    this.#bus.emit('progress:changed', this.progress);
  }

  isCompleted(missionId) {
    return this.progress.completed.some((entry) => entry.id === missionId);
  }

  starsFor(missionId) {
    return this.progress.completed.find((entry) => entry.id === missionId)?.stars ?? 0;
  }

  async completeMission(missionId, stars) {
    const previousXp = this.progress.xp;
    const previousStars = this.starsFor(missionId);
    const completed = this.progress.completed.filter((entry) => entry.id !== missionId);
    completed.push({ id: missionId, stars: Math.max(stars, previousStars), at: Date.now() });

    this.progress = { ...this.progress, completed, xp: this.#totalXp(completed) };
    await this.#save();
    return { previousXp, xp: this.progress.xp, gained: this.progress.xp - previousXp, firstTime: previousStars === 0 };
  }

  async updateSettings(patch) {
    this.progress = { ...this.progress, settings: { ...this.progress.settings, ...patch } };
    await this.#save();
  }

  async #save() {
    try {
      this.progress = await this.#store.save(this.progress);
    } catch (error) {
      this.#bus.emit('notify', { kind: 'error', text: `Progress could not be saved: ${error.message}` });
    }
    this.#bus.emit('progress:changed', this.progress);
  }

  #merge(account, guest) {
    const byId = new Map(account.completed.map((entry) => [entry.id, entry]));
    for (const entry of guest.completed) {
      const existing = byId.get(entry.id);
      if (!existing || entry.stars > existing.stars) byId.set(entry.id, entry);
    }
    const completed = [...byId.values()];
    return { ...account, completed, xp: this.#totalXp(completed) };
  }

  #totalXp(completed) {
    return completed.reduce((sum, entry) => sum + this.#xpFor(entry.id, entry.stars), 0);
  }
}
