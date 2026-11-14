/** Thrown for invalid input; the UI shows the message instead of animating. */
export class OperationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OperationError';
  }
}

function normaliseArgument(param, raw) {
  if (param.kind === 'int') {
    const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
    if (String(raw ?? '').trim() === '' || !Number.isInteger(value) || value < param.min || value > param.max) {
      throw new OperationError(`${param.label} must be a whole number from ${param.min} to ${param.max}.`);
    }
    return value;
  }
  const word = String(raw ?? '').trim().toLowerCase();
  if (!/^[a-z]+$/.test(word) || word.length > param.max) {
    throw new OperationError(`${param.label} must be 1-${param.max} letters (a-z).`);
  }
  return word;
}

/**
 * Base class for every simulated data structure.
 *
 * A subclass implements:
 *   operations() -> [{ id, label, params, complexity, summary }]
 *   one method per operation id, calling this.capture(message, marks) at each teaching moment
 *   scene(marks) -> { nodes, edges, labels } describing the current state
 *   state()      -> plain data used by mission goals and tests
 *
 * run() executes an operation and returns the recorded frames for the animation player.
 */
export class Structure {
  #frames = [];
  #idCounter = 0;

  operations() {
    return [];
  }

  run(operationId, args = []) {
    const operation = this.operations().find((candidate) => candidate.id === operationId);
    if (!operation) throw new OperationError(`Unknown operation "${operationId}".`);
    const values = operation.params.map((param, index) => normaliseArgument(param, args[index]));

    this.#frames = [];
    this.beforeOperation();
    const result = this[operation.id](...values);
    if (this.#frames.length === 0) this.capture('Done.');
    return { frames: this.#frames, result, args: values };
  }

  /** Runs operations without keeping frames (used for seeding and replays). */
  runSilently(steps) {
    for (const [operationId, ...args] of steps) this.run(operationId, args);
    this.#frames = [];
    this.beforeOperation();
  }

  snapshot(message = '') {
    return { ...this.scene({}), message };
  }

  capture(message, marks = {}) {
    this.#frames.push({ ...this.scene(marks), message });
  }

  nextId(prefix) {
    this.#idCounter += 1;
    return `${prefix}${this.#idCounter}`;
  }

  /** Hook for clearing per-operation decorations such as traversal output. */
  beforeOperation() {}

  scene() {
    throw new Error(`${this.constructor.name} must implement scene().`);
  }

  state() {
    return {};
  }
}

export function makeNode(id, x, y, label, marks, options = {}) {
  return {
    id,
    x,
    y,
    label: String(label),
    shape: options.shape ?? 'circle',
    state: marks[id] ?? options.state ?? 'normal',
    caption: options.caption ?? '',
    variant: options.variant ?? '',
  };
}

export function makeEdge(from, to, marks = {}, options = {}) {
  const id = options.id ?? `${from}>${to}`;
  return { id, from, to, directed: options.directed ?? true, state: marks[id] ?? 'normal' };
}

export function makeLabel(id, x, y, text, kind = 'info') {
  return { id, x, y, text: String(text), kind };
}

export const emptyLabel = (text = 'empty') => makeLabel('empty', 0, 0, `(${text})`, 'muted');
