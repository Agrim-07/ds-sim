/** One encrypted JSON document per user inside a named collection (progress, history, ...). */
export class EncryptedDocumentRepository {
  #store;
  #cipher;
  #collection;
  #createDefault;

  constructor(store, cipher, collection, createDefault) {
    this.#store = store;
    this.#cipher = cipher;
    this.#collection = collection;
    this.#createDefault = createDefault;
  }

  get(userId) {
    const payload = this.#store.read((data) => {
      const table = data[this.#collection];
      return Object.hasOwn(table, userId) ? table[userId] : null;
    });
    return payload ? this.#cipher.decrypt(this.#scope(userId), payload) : this.#createDefault();
  }

  /** Reads, changes and re-encrypts the document inside one queued write, so concurrent updates never overwrite each other. */
  update(userId, mutator) {
    return this.#store.update((data) => {
      const table = data[this.#collection];
      const current = Object.hasOwn(table, userId)
        ? this.#cipher.decrypt(this.#scope(userId), table[userId])
        : this.#createDefault();
      const next = mutator(current);
      table[userId] = this.#cipher.encrypt(this.#scope(userId), next);
      return next;
    });
  }

  remove(userId) {
    return this.#store.update((data) => {
      delete data[this.#collection][userId];
    });
  }

  #scope(userId) {
    return `${this.#collection}:${userId}`;
  }
}
