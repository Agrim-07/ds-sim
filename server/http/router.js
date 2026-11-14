export class Router {
  #routes = new Map();

  on(method, path, handler) {
    if (!this.#routes.has(path)) this.#routes.set(path, new Map());
    this.#routes.get(path).set(method, handler);
    return this;
  }

  /** Returns the handler, { methodNotAllowed: true } when the path exists for other methods, or null. */
  match(method, path) {
    const methods = this.#routes.get(path);
    if (!methods) return null;
    const handler = methods.get(method);
    return handler ? { handler } : { methodNotAllowed: true, allowed: [...methods.keys()] };
  }
}
