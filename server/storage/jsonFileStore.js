import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A single JSON document kept in memory and persisted atomically
 * (write to a temp file, then rename). Writes are serialised through a queue,
 * so each mutator sees the result of the previous one.
 */
export class JsonFileStore {
  #file;
  #initialState;
  #data = null;
  #queue = Promise.resolve();

  constructor(file, initialState) {
    this.#file = file;
    this.#initialState = initialState;
  }

  async load() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.#file, 'utf8'));
      this.#data = { ...structuredClone(this.#initialState), ...parsed };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.#data = structuredClone(this.#initialState);
      await this.#persist();
    }
  }

  read(selector) {
    if (!this.#data) throw new Error('Store has not been loaded.');
    return selector(this.#data);
  }

  update(mutator) {
    const run = async () => {
      const draft = structuredClone(this.#data);
      const result = mutator(draft);
      const previous = this.#data;
      this.#data = draft;
      try {
        await this.#persist();
      } catch (error) {
        this.#data = previous;
        throw error;
      }
      return result;
    };
    const next = this.#queue.then(run, run);
    this.#queue = next.catch(() => {});
    return next;
  }

  async #persist() {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    const temp = `${this.#file}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(this.#data), { mode: 0o600 });
    await fs.rename(temp, this.#file);
  }
}
