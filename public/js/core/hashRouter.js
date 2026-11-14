/**
 * Hash-based router. A view is any object with mount(container, { params, query })
 * that may return a cleanup function (or a promise of one).
 */
export class HashRouter {
  #outlet;
  #routes = [];
  #cleanup = null;
  #navigationId = 0;
  #onChange;

  constructor(outlet, { onChange = () => {} } = {}) {
    this.#outlet = outlet;
    this.#onChange = onChange;
  }

  add(pattern, view) {
    const keys = [];
    const source = pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.#routes.push({ regex: new RegExp(`^${source}$`), keys, view, pattern });
    return this;
  }

  start() {
    window.addEventListener('hashchange', () => this.#resolve());
    this.#resolve();
  }

  navigate(path) {
    if (location.hash === `#${path}`) this.#resolve();
    else location.hash = path;
  }

  refresh() {
    this.#resolve();
  }

  async #resolve() {
    let raw;
    try {
      raw = decodeURI(location.hash.slice(1)) || '/';
    } catch {
      raw = '/';
    }
    const [pathname, search = ''] = raw.split('?');
    const route = this.#routes.find((candidate) => candidate.regex.test(pathname));
    if (!route) {
      this.navigate('/');
      return;
    }

    const navigationId = ++this.#navigationId;
    const match = route.regex.exec(pathname);
    const params = Object.fromEntries(route.keys.map((key, index) => [key, match[index + 1]]));

    if (typeof this.#cleanup === 'function') this.#cleanup();
    this.#cleanup = null;
    this.#outlet.replaceChildren();
    window.scrollTo(0, 0);
    this.#onChange(route.pattern);

    const cleanup = await route.view.mount(this.#outlet, { params, query: new URLSearchParams(search) });
    if (navigationId === this.#navigationId) this.#cleanup = cleanup ?? null;
    else if (typeof cleanup === 'function') cleanup();
  }
}
