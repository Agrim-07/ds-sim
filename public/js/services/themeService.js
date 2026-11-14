import { localStore } from '../core/localStore.js';

const NEXT = { light: 'dark', dark: 'light' };
const CACHE_KEY = 'ds-sim.theme';

export class ThemeService {
  #progress;
  #media = window.matchMedia('(prefers-color-scheme: dark)');
  #loaded = false;

  constructor(progress, bus) {
    this.#progress = progress;
    bus.on('progress:changed', () => {
      this.#loaded = true;
      this.apply();
    });
    this.#media.addEventListener('change', () => this.apply());
  }

  /** Until progress has loaded, the last theme used in this browser is applied to avoid a flash. */
  get preference() {
    if (!this.#loaded) return localStore.read(CACHE_KEY, 'system');
    return this.#progress.progress.settings.theme;
  }

  get resolved() {
    if (this.preference === 'light' || this.preference === 'dark') return this.preference;
    return this.#media.matches ? 'dark' : 'light';
  }

  apply() {
    document.documentElement.dataset.theme = this.resolved;
    if (this.#loaded) localStore.write(CACHE_KEY, this.preference);
  }

  async set(theme) {
    await this.#progress.updateSettings({ theme });
    this.apply();
  }

  toggle() {
    return this.set(NEXT[this.resolved]);
  }
}
