import { h } from '../core/dom.js';

const DISPLAY_MS = 4000;

export class Toaster {
  #root;

  constructor(root) {
    this.#root = root;
  }

  show(text, kind = 'info') {
    const toast = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, text);
    this.#root.append(toast);
    setTimeout(() => {
      toast.classList.add('toast-leaving');
      setTimeout(() => toast.remove(), 300);
    }, DISPLAY_MS);
  }
}
